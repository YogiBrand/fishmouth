"""Outbox messaging orchestration for email and SMS sends."""

from __future__ import annotations

import base64
import logging
import secrets
import string
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.lib.events import EventPayload as DomainEvent, emit_event
from config import get_settings
from database import SessionLocal
from models import (
    ContractorProspect,
    ContractorProspectEvent,
    MessageEvent,
    OutboxMessage,
)
from services.messaging import (
    MessagingProviderError,
    ProviderResult,
    SendGridEmailProvider,
    TelnyxSmsProvider,
)

logger = logging.getLogger("services.outbox")
UPLOAD_ROOT = Path("uploads")


def _generate_short_code(length: int = 8) -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def _absolute_url(path: str) -> str:
    settings = get_settings()
    base = settings.base_url
    if not base:
        return path
    return f"{str(base).rstrip('/')}{path}"


def _record_event(session: Session, message_id: str, event_type: str, meta: Dict[str, Any]) -> None:
    message_id = str(message_id)
    event = MessageEvent(
        message_id=message_id,
        type=event_type,
        meta=meta,
        occurred_at=datetime.utcnow(),
    )
    session.add(event)


def _emit_domain_event(session: Session, message: OutboxMessage, event_type: str, payload: Dict[str, Any]) -> None:
    try:
        event_payload = {**payload, "message_id": str(message.id), "channel": message.channel}
        lead_id_value = payload.get("lead_id")
        report_id_value = payload.get("report_id")
        ev = DomainEvent(
            type=f"message.{event_type}",
            source_service="messaging.outbox",
            report_id=str(report_id_value) if report_id_value is not None else None,
            lead_id=str(lead_id_value) if lead_id_value is not None else None,
            payload=event_payload,
        )
        emit_event(session, ev)
    except Exception as exc:  # pragma: no cover - defensive
        logger.warning("outbox.emit_event.failed", extra={"error": str(exc)})


def _sync_prospect_from_message_event(
    session: Session,
    message: OutboxMessage,
    event_type: str,
    meta: Dict[str, Any],
    occurred_at: datetime,
) -> None:
    payload = message.payload if isinstance(message.payload, dict) else None
    if not payload:
        return

    context = payload.get("context")
    if not isinstance(context, dict):
        return

    prospect_id = context.get("prospect_id")
    if not prospect_id:
        return

    prospect = (
        session.query(ContractorProspect)
        .filter(ContractorProspect.id == prospect_id)
        .one_or_none()
    )
    if not prospect:
        return

    status_map = {
        "delivered": "contacted",
        "opened": "engaged",
        "clicked": "engaged",
        "bounced": "invalid",
        "failed": "invalid",
    }
    next_status = status_map.get(event_type)
    if next_status and prospect.status not in {"converted", "demo_booked"}:
        prospect.status = next_status
    if event_type in {"opened", "clicked"}:
        prospect.reply_status = event_type
        prospect.last_reply_at = occurred_at

    metadata = prospect.metadata or {}
    metadata.update({
        "last_message_event": event_type,
        "last_message_at": occurred_at.isoformat(),
        "outbox_id": str(message.id),
    })
    prospect.metadata = metadata

    session.add(
        ContractorProspectEvent(
            prospect_id=prospect.id,
            type=f"outreach.{event_type}",
        payload={**meta, "message_id": str(message.id)},
            occurred_at=occurred_at,
        )
    )


def _resolve_attachment_file(message: OutboxMessage, attachment: Dict[str, Any]) -> Dict[str, Any]:
    if not attachment:
        return attachment

    resolved = {k: v for k, v in attachment.items() if k not in {"source", "url"}}
    if attachment.get("content"):
        return resolved if resolved else attachment

    context = message.payload.get("context") or {}
    candidate_path: Optional[Path] = None
    source = attachment.get("source")
    url = attachment.get("url")

    if source == "report_pdf":
        pdf_url = url or context.get("pdf_url")
        report_id = context.get("report_id")
        if pdf_url and pdf_url.startswith("/uploads/"):
            candidate_path = UPLOAD_ROOT / pdf_url.split("/uploads/")[1]
        elif report_id:
            candidate_path = UPLOAD_ROOT / "reports" / f"{report_id}.pdf"
    elif url and url.startswith("/uploads/"):
        candidate_path = UPLOAD_ROOT / url.split("/uploads/")[1]

    if candidate_path and candidate_path.exists():
        try:
            encoded = base64.b64encode(candidate_path.read_bytes()).decode("utf-8")
            return {
                "content": encoded,
                "filename": resolved.get("filename") or candidate_path.name,
                "type": resolved.get("type") or attachment.get("type") or "application/octet-stream",
                "disposition": resolved.get("disposition") or attachment.get("disposition", "attachment"),
            }
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "outbox.attachment.read_failed",
                extra={"error": str(exc), "message_id": message.id, "path": str(candidate_path)},
            )

    return resolved if resolved else attachment


def _prepare_shortlinks(
    channel: str,
    html: Optional[str],
    text: Optional[str],
    context: Optional[Dict[str, Any]],
) -> Tuple[Optional[str], Optional[str], List[Dict[str, Any]]]:
    if not context:
        return html, text, []

    share_url = context.get("share_url") or context.get("public_share_url")
    if not share_url:
        return html, text, []

    code = _generate_short_code()
    relative = f"/l/{code}"
    absolute = _absolute_url(relative)

    replacements = {
        "{{shortlink}}": absolute,
        "{{shortlink_url}}": absolute,
        "{{share_url}}": absolute,
    }

    updated_html = html
    updated_text = text
    if updated_html:
        for key, value in replacements.items():
            updated_html = updated_html.replace(key, value)
    if updated_text:
        for key, value in replacements.items():
            updated_text = updated_text.replace(key, value)

    shortlink_meta = {
        "code": code,
        "target": share_url,
        "channel": channel,
        "absolute_url": absolute,
    }
    if context.get("report_id"):
        shortlink_meta["report_id"] = context["report_id"]
    if context.get("lead_id"):
        shortlink_meta["lead_id"] = context["lead_id"]

    return updated_html, updated_text, [shortlink_meta]


def queue_outbox_message(
    *,
    channel: str,
    to_address: str,
    subject: Optional[str] = None,
    html: Optional[str] = None,
    text: Optional[str] = None,
    attachments: Optional[List[Dict[str, Any]]] = None,
    headers: Optional[Dict[str, str]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Persist message in outbox and mark as queued."""

    session = SessionLocal()
    try:
        updated_html, updated_text, shortlinks = _prepare_shortlinks(channel, html, text, context)
        payload: Dict[str, Any] = {
            "channel": channel,
            "to": to_address,
            "subject": subject,
            "html": updated_html,
            "text": updated_text,
            "attachments": attachments or [],
            "headers": headers or {},
            "metadata": metadata or {},
            "context": context or {},
            "shortlinks": shortlinks,
        }

        message = OutboxMessage(
            channel=channel,
            to_address=to_address,
            subject=subject,
            body_html=updated_html,
            body_text=updated_text,
            payload=payload,
            status="queued",
            queued_at=datetime.utcnow(),
        )
        session.add(message)
        session.flush()

        headers_map = dict(payload.get("headers") or {})
        if "X-Fishmouth-Message-ID" not in headers_map:
            headers_map["X-Fishmouth-Message-ID"] = message.id
        payload["headers"] = headers_map

        custom_args = dict(payload.get("custom_args") or {})
        custom_args.setdefault("outbox_id", str(message.id))
        payload["custom_args"] = custom_args

        message.payload = payload

        _record_event(session, message.id, "queued", {"context": context or {}, "shortlinks": shortlinks})
        _emit_domain_event(session, message, "queued", {"context": context or {}, "shortlinks": shortlinks})

        session.commit()
        logger.info("outbox.queued", extra={"id": message.id, "channel": channel})
        return {
            "id": str(message.id),
            "status": message.status,
            "shortlinks": shortlinks,
        }
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def deliver_outbox_message(message_id: str) -> Dict[str, Any]:
    """Deliver a queued outbox message via the configured provider."""

    session = SessionLocal()
    settings = get_settings()
    try:
        message: Optional[OutboxMessage] = (
            session.query(OutboxMessage)
            .filter(OutboxMessage.id == message_id)
            .first()
        )
        if not message:
            logger.warning("outbox.missing", extra={"id": message_id})
            return {"status": "missing", "id": message_id}

        if message.status not in {"queued", "retry"}:
            logger.info("outbox.skip", extra={"id": message_id, "status": message.status})
            return {"status": message.status, "id": message_id}

        message.status = "sending"
        session.add(message)
        session.commit()

        provider_result: Optional[ProviderResult] = None
        provider_meta: Dict[str, Any] = {}

        try:
            if message.channel == "email":
                sender_domain = settings.base_url.host if settings.base_url else "fishmouth.app"
                sender_email = f"no-reply@{sender_domain}"
                provider = SendGridEmailProvider(
                    settings.providers.sendgrid_api_key,
                    sender_email,
                    dry_run=settings.feature_flags.outbox_dry_run,
                )
                headers_map = dict(message.payload.get("headers") or {})
                headers_map.setdefault("X-Fishmouth-Message-ID", message.id)
                custom_args = dict(message.payload.get("custom_args") or {})
                custom_args.setdefault("message_id", str(message.id))
                if message.payload.get("context"):
                    custom_args.setdefault("context", message.payload.get("context"))
                attachments = [
                    _resolve_attachment_file(message, att)
                    for att in message.payload.get("attachments", [])
                ]
                payload_snapshot = dict(message.payload)
                payload_snapshot["headers"] = headers_map
                payload_snapshot["custom_args"] = custom_args
                if attachments:
                    payload_snapshot["attachments"] = attachments
                message.payload = _normalize_payload_snapshot(payload_snapshot)
                provider_result = provider.send(
                    to_address=message.to_address,
                    subject=message.subject,
                    html=message.body_html,
                    text=message.body_text,
                    attachments=attachments,
                    headers=headers_map,
                    custom_args=custom_args,
                )
            elif message.channel == "sms":
                from_number = settings.providers.telnyx_from_number or "+15555550123"
                provider = TelnyxSmsProvider(
                    settings.providers.telnyx_api_key,
                    from_number=from_number,
                    messaging_profile_id=settings.providers.telnyx_messaging_profile_id,
                    dry_run=settings.feature_flags.outbox_dry_run,
                )
                payload_snapshot = dict(message.payload)
                payload_snapshot["tags"] = [f"message_id:{message.id}"]
                payload_snapshot["metadata"] = {"message_id": str(message.id)}
                message.payload = _normalize_payload_snapshot(payload_snapshot)
                provider_result = provider.send(
                    to_number=message.to_address,
                    text=message.body_text or message.body_html or "",
                    tags={"message_id": str(message.id)},
                    metadata={"message_id": str(message.id)},
                )
            else:
                raise MessagingProviderError(f"Unsupported channel: {message.channel}")

            now = datetime.utcnow()
            message.status = "sent"
            message.sent_at = now
            message.provider = provider_result.provider if provider_result else None
            message.provider_message_id = provider_result.message_id if provider_result else None
            if provider_result and provider_result.dry_run:
                message.delivered_at = now

            provider_meta = {
                "provider": message.provider,
                "dry_run": provider_result.dry_run if provider_result else True,
                "payload": provider_result.payload if provider_result else {},
                "message_id": provider_result.message_id if provider_result else None,
            }

            _record_event(session, message.id, "sent", provider_meta)
            _emit_domain_event(
                session,
                message,
                "sent",
                {
                    **message.payload.get("context", {}),
                    **provider_meta,
                },
            )
            session.commit()
            logger.info("outbox.sent", extra={"id": message.id, "provider": message.provider})
            return {"status": message.status, "id": message.id, **provider_meta}
        except MessagingProviderError as exc:
            session.rollback()
            failed_message = (
                session.query(OutboxMessage)
                .filter(OutboxMessage.id == message_id)
                .first()
            )
            if failed_message:
                failed_message.status = "failed"
                failed_message.error = str(exc)
                provider_meta = {"error": str(exc)}
                _record_event(session, failed_message.id, "failed", provider_meta)
                _emit_domain_event(
                    session,
                    failed_message,
                    "failed",
                    {
                        **failed_message.payload.get("context", {}),
                        **provider_meta,
                    },
                )
                session.commit()
            logger.exception("outbox.send.failed", extra={"id": message_id})
            return {"status": "failed", "id": message_id, "error": str(exc)}
    finally:
        session.close()


def register_click_event(message_id: str, shortlink: Dict[str, Any]) -> None:
    """Persist a click event for a message shortlink."""

    payload = {"shortlink": shortlink}
    record_message_event(message_id, "clicked", payload)


__all__ = [
    "deliver_outbox_message",
    "record_message_event",
    "queue_outbox_message",
    "register_click_event",
]


def record_message_event(
    message_id: str,
    event_type: str,
    meta: Optional[Dict[str, Any]] = None,
    *,
    occurred_at: Optional[datetime] = None,
    update_status: Optional[str] = None,
    error: Optional[str] = None,
) -> bool:
    """Record a message event and optionally update outbox status."""

    session = SessionLocal()
    try:
        message = (
            session.query(OutboxMessage)
            .filter(OutboxMessage.id == message_id)
            .first()
        )
        if not message:
            return False

        event_time = occurred_at or datetime.utcnow()
        event = MessageEvent(
            message_id=str(message.id),
            type=event_type,
            meta=meta or {},
            occurred_at=event_time,
        )
        session.add(event)

        if update_status:
            message.status = update_status
            if update_status == "delivered":
                message.delivered_at = event_time
            elif update_status == "failed" and error:
                message.error = error
        if error:
            message.error = error

        _sync_prospect_from_message_event(session, message, event_type, meta or {}, event_time)

        _emit_domain_event(
            session,
            message,
            event_type,
            {
                **message.payload.get("context", {}),
                **(meta or {}),
            },
        )

        session.commit()
        return True
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

def _normalize_payload_snapshot(payload: Dict[str, Any]) -> Dict[str, Any]:
    def _coerce(value: Any) -> Any:
        if isinstance(value, dict):
            return {k: _coerce(v) for k, v in value.items()}
        if isinstance(value, list):
            return [_coerce(item) for item in value]
        if isinstance(value, (str, int, float, bool)) or value is None:
            return value
        return str(value)

    return {key: _coerce(val) for key, val in payload.items()}
