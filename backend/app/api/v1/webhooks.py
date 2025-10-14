"""Webhook handlers for Telnyx and Vapi events."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Dict

from fastapi import APIRouter, BackgroundTasks, HTTPException, Request
import sqlalchemy as sa

from app.core.database import get_db
from app.models import AICall, ScheduledSMS
from app.services.ai_voice_agent import AIVoiceAgentService

router = APIRouter(prefix="/api/v1/webhooks", tags=["webhooks"])


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
