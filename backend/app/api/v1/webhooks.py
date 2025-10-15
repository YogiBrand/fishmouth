"""Webhook handlers for Telnyx, SendGrid, and Vapi events."""

from __future__ import annotations

import base64
import hmac
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import sqlalchemy as sa
from sqlalchemy.orm import Session
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
from sendgrid.helpers.eventwebhook import EventWebhook, EventWebhookHeader

from app.core.config import get_settings
from app.core.database import get_db
from app.models import AICall, OutboxMessage, ScheduledSMS
from app.services.ai_voice_agent import AIVoiceAgentService
from database import SessionLocal
from services.outbox_service import record_message_event

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])

logger = logging.getLogger(__name__)
event_webhook = EventWebhook()
settings = get_settings()

SENDGRID_EVENT_MAP: Dict[str, tuple[str, Optional[str]]] = {
    "processed": ("sent", "sent"),
    "delivered": ("delivered", "delivered"),
    "open": ("opened", None),
    "click": ("clicked", None),
    "bounce": ("bounced", "bounced"),
    "dropped": ("failed", "failed"),
    "spamreport": ("bounced", "bounced"),
}

TELNYX_EVENT_MAP: Dict[str, tuple[str, Optional[str]]] = {
    "message.sent": ("sent", "sent"),
    "message.delivered": ("delivered", "delivered"),
    "message.delivery_succeeded": ("delivered", "delivered"),
    "message.delivery_failed": ("failed", "failed"),
    "message.failed": ("failed", "failed"),
    "message.bounced": ("bounced", "bounced"),
}


def _verify_sendgrid(payload: bytes, request: Request) -> bool:
    signature = request.headers.get(EventWebhookHeader.SIGNATURE)
    timestamp = request.headers.get(EventWebhookHeader.TIMESTAMP)
    public_key = settings.providers.sendgrid_event_public_key
    if not public_key:
        logger.warning("sendgrid.webhook.public_key_missing")
        return True
    if not signature or not timestamp:
        return False
    try:
        event_webhook.verify_signature(payload, signature, timestamp, public_key)
        return True
    except Exception:  # pragma: no cover - signature failure path
        return False


def _verify_telnyx(payload: bytes, request: Request) -> bool:
    timestamp = (
        request.headers.get("telnyx-timestamp")
        or request.headers.get("Telnyx-Timestamp")
    )
    if not timestamp:
        return False

    message = f"{timestamp}|{payload.decode('utf-8')}".encode("utf-8")

    signature = (
        request.headers.get("telnyx-signature-ed25519")
        or request.headers.get("Telnyx-Signature-Ed25519")
    )
    public_key_b64 = settings.providers.telnyx_webhook_public_key
    if signature and public_key_b64:
        try:
            public_key = Ed25519PublicKey.from_public_bytes(base64.b64decode(public_key_b64))
            public_key.verify(base64.b64decode(signature), message)
            return True
        except (InvalidSignature, ValueError):
            return False

    secret = settings.providers.telnyx_webhook_secret
    if secret:
        hmac_signature = (
            request.headers.get("telnyx-signature-256")
            or request.headers.get("Telnyx-Signature-256")
        )
        if not hmac_signature:
            return False
        expected = hmac.new(secret.encode("utf-8"), message, digestmod="sha256").hexdigest()
        return hmac.compare_digest(expected, hmac_signature)
    logger.warning("telnyx.webhook.credentials_missing")
    return True


def _event_timestamp(payload: Dict[str, Any]) -> datetime:
    ts = payload.get("timestamp")
    if isinstance(ts, (int, float)):
        return datetime.utcfromtimestamp(ts)
    occurred_at = payload.get("occurred_at") or payload.get("occurredAt")
    if isinstance(occurred_at, str):
        try:
            return datetime.fromisoformat(occurred_at.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
        except ValueError:
            pass
    return datetime.utcnow()


def _resolve_outbox_id(event: Dict[str, Any], session: Session) -> Optional[str]:
    custom_args = event.get("custom_args") or event.get("customArgs")
    if isinstance(custom_args, str):
        try:
            custom_args = json.loads(custom_args)
        except json.JSONDecodeError:
            custom_args = {}
    if isinstance(custom_args, dict):
        candidate = (
            custom_args.get("outbox_id")
            or custom_args.get("message_id")
            or custom_args.get("outboxId")
        )
        if candidate:
            return candidate

    provider_id = (
        event.get("sg_message_id")
        or event.get("message_id")
        or event.get("data", {}).get("payload", {}).get("id")
    )
    if not provider_id:
        return None

    message = (
        session.query(OutboxMessage)
        .filter(OutboxMessage.provider_message_id == provider_id)
        .order_by(OutboxMessage.created_at.desc())
        .first()
    )
    return message.id if message else None


def _extract_telnyx_error(payload: Dict[str, Any]) -> Optional[str]:
    errors = payload.get("errors")
    if isinstance(errors, list) and errors:
        first = errors[0]
        if isinstance(first, dict):
            return first.get("detail") or first.get("title") or first.get("code")
        return str(first)
    if isinstance(errors, dict):
        return errors.get("detail") or errors.get("title")
    return payload.get("delivery_status")


@router.post("/sendgrid", status_code=202)
async def sendgrid_events(request: Request) -> Dict[str, Any]:
    payload = await request.body()
    if not _verify_sendgrid(payload, request):
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        events_data = json.loads(payload.decode("utf-8") or "[]")
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    if isinstance(events_data, dict):
        events: List[Dict[str, Any]] = [events_data]
    elif isinstance(events_data, list):
        events = events_data
    else:
        raise HTTPException(status_code=400, detail="Webhook payload must be list or object")

    session = SessionLocal()
    processed = 0
    try:
        for event in events:
            mapping = SENDGRID_EVENT_MAP.get(event.get("event"))
            if not mapping:
                continue
            internal_event, update_status = mapping
            message_id = _resolve_outbox_id(event, session)
            if not message_id:
                continue

            meta = {
                "provider": "sendgrid",
                "event": event.get("event"),
                "provider_id": event.get("sg_message_id") or event.get("message_id"),
                "email": event.get("email"),
                "url": event.get("url"),
            }
            if event.get("reason"):
                meta["reason"] = event.get("reason")

            record_message_event(
                message_id,
                internal_event,
                meta,
                occurred_at=_event_timestamp(event),
                update_status=update_status,
                error=event.get("reason"),
            )
            processed += 1
    finally:
        session.close()

    return {"status": "ok", "processed": processed}


@router.post("/telnyx", status_code=202)
async def telnyx_outbox_events(request: Request) -> Dict[str, Any]:
    payload = await request.body()
    if not _verify_telnyx(payload, request):
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        event = json.loads(payload.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    data = event.get("data", {})
    event_type = data.get("event_type") or data.get("type")
    mapping = TELNYX_EVENT_MAP.get(event_type)
    if not mapping:
        logger.debug("telnyx.webhook.ignored", event_type=event_type)
        return {"status": "ignored", "event": event_type}

    internal_event, update_status = mapping
    payload_data = data.get("payload", {})
    session = SessionLocal()
    try:
        message_id: Optional[str] = None
        tags = payload_data.get("tags")
        if isinstance(tags, list):
            for entry in tags:
                if isinstance(entry, str) and entry.startswith("message_id:"):
                    message_id = entry.split(":", 1)[1]
                    break
        elif isinstance(tags, dict):
            message_id = tags.get("message_id")

        metadata = payload_data.get("metadata")
        if not message_id and isinstance(metadata, dict):
            message_id = metadata.get("message_id")

        if not message_id:
            message_id = _resolve_outbox_id({"data": {"payload": {"id": payload_data.get("id")}}}, session)

        if not message_id:
            return {"status": "ignored", "event": event_type}

        meta = {
            "provider": "telnyx",
            "event": event_type,
            "provider_id": payload_data.get("id"),
            "to": payload_data.get("to"),
            "from": payload_data.get("from"),
        }
        error_detail = _extract_telnyx_error(payload_data)
        if error_detail:
            meta["error"] = error_detail

        record_message_event(
            message_id,
            internal_event,
            meta,
            occurred_at=_event_timestamp(data),
            update_status=update_status,
            error=error_detail,
        )
    finally:
        session.close()

    return {"status": "ok", "event": event_type}


@router.post("/telnyx/sms")
async def telnyx_sms(request: Request, background_tasks: BackgroundTasks):
    signature = request.headers.get("telnyx-signature-ed25519")
    timestamp = request.headers.get("telnyx-timestamp")
    payload = await request.body()

    if not AIVoiceAgentService.verify_telnyx_webhook(payload, signature, timestamp):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = json.loads(payload)
    data = event.get("data", {})
    payload_data = data.get("payload", {})

    message_id = payload_data.get("id")
    event_type = data.get("event_type")

    background_tasks.add_task(_update_sms_status, message_id, event_type)
    return {"status": "received"}


@router.post("/telnyx/call")
async def telnyx_call(request: Request, background_tasks: BackgroundTasks):
    signature = request.headers.get("telnyx-signature-ed25519")
    timestamp = request.headers.get("telnyx-timestamp")
    payload = await request.body()

    if not AIVoiceAgentService.verify_telnyx_webhook(payload, signature, timestamp):
        raise HTTPException(status_code=401, detail="Invalid signature")

    event = json.loads(payload)
    data = event.get("data", {})
    call_payload = data.get("payload", {})

    call_control_id = call_payload.get("call_control_id")
    event_type = data.get("event_type")

    background_tasks.add_task(_process_call_event, call_control_id, event_type, call_payload)
    return {"status": "received"}


@router.post("/vapi/call-completed")
async def vapi_call_completed(request: Request, background_tasks: BackgroundTasks):
    body = await request.json()
    call = body.get("call", {})
    call_id = call.get("id")
    outcome = {
        "appointment_booked": body.get("appointmentBooked"),
        "appointment_time": body.get("appointmentTime"),
        "duration_seconds": call.get("durationSeconds"),
        "outcome": call.get("endedReason"),
    }

    if not call_id:
        raise HTTPException(status_code=400, detail="Missing call id")

    service = AIVoiceAgentService()
    background_tasks.add_task(service.handle_call_completed, call_id, outcome)
    return {"status": "processed"}


async def _update_sms_status(message_id: str, event_type: str) -> None:
    if not message_id:
        return
    status_map = {
        "message.sent": "sent",
        "message.delivered": "delivered",
        "message.failed": "failed",
    }
    status = status_map.get(event_type, event_type)

    db = await get_db()
    try:
        await db.execute(
            sa.update(ScheduledSMS)
            .where(ScheduledSMS.telnyx_message_id == message_id)
            .values(delivery_status=status, delivered_at=datetime.utcnow())
        )
        await db.commit()
    finally:
        await db.close()


async def _process_call_event(call_control_id: str, event_type: str, payload: Dict[str, object]) -> None:
    if not call_control_id:
        return

    status_map = {
        "call.initiated": "initiated",
        "call.answered": "in_progress",
        "call.hangup": "completed",
        "call.failed": "failed",
    }
    duration = payload.get("duration_secs") or payload.get("duration_seconds") or 0

    db = await get_db()
    try:
        values = {
            "status": status_map.get(event_type, event_type),
            "duration_seconds": duration,
        }
        if event_type == "call.answered":
            values["answered_at"] = datetime.utcnow()
        if event_type in {"call.hangup", "call.failed"}:
            values["completed_at"] = datetime.utcnow()

        await db.execute(
            sa.update(AICall).where(AICall.telnyx_call_id == call_control_id).values(**values)
        )
        await db.commit()
    finally:
        await db.close()
