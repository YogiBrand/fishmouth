"""Outbox messaging endpoints."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.database import DatabaseSession, get_db
from services.outbox_service import deliver_outbox_message, queue_outbox_message
from tasks.message_tasks import deliver as deliver_task

router = APIRouter(prefix="/api/v1/outbox", tags=["messaging"])

settings = get_settings()


class Attachment(BaseModel):
    filename: str
    content: str
    type: Optional[str] = None
    disposition: Optional[str] = Field(default="attachment")


class OutboxSendRequest(BaseModel):
    channel: str = Field(pattern="^(email|sms)$")
    to: str
    subject: Optional[str] = None
    html: Optional[str] = None
    text: Optional[str] = None
    attachments: Optional[List[Attachment]] = None
    headers: Optional[Dict[str, str]] = None
    metadata: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None


class OutboxSendResponse(BaseModel):
    id: str
    status: str
    shortlinks: List[Dict[str, Any]] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)


async def _enforce_consent_and_collect_warnings(db: DatabaseSession, req: OutboxSendRequest) -> List[str]:
    warnings: List[str] = []
    lead_id = (req.context or {}).get("lead_id") if req.context else None
    if not lead_id:
        return warnings

    record = await db.fetch_one(
        sa.text(
            """
            SELECT dnc, consent_email, consent_sms, consent_voice, voice_opt_out, contact_enrichment_status
            FROM leads WHERE id = :id
            """
        ),
        {"id": lead_id},
    )
    if not record:
        return warnings

    channel = req.channel
    if record.get("dnc"):
        warnings.append("Lead is marked do-not-contact; confirm before sending.")
    if channel == "email" and not record.get("consent_email"):
        warnings.append("Lead has not granted email consent.")
    if channel == "sms" and not record.get("consent_sms"):
        warnings.append("Lead has not granted SMS consent.")

    if record.get("voice_opt_out"):
        warnings.append("Lead has voice opt-out enabled; avoid manual calls.")
    if record.get("contact_enrichment_status") == "failed":
        warnings.append("Lead contact enrichment failed; verify consent before sending.")
    return warnings


@router.post("/send", response_model=OutboxSendResponse)
async def send_outbox_message(req: OutboxSendRequest, db: DatabaseSession = Depends(get_db)) -> OutboxSendResponse:
    """Queue a message for delivery via the messaging outbox."""

    if req.channel == "email":
        if not req.subject:
            raise HTTPException(status_code=400, detail="Email subject is required")
        if not (req.html or req.text):
            raise HTTPException(status_code=400, detail="Email body (html or text) required")
    elif req.channel == "sms":
        if not (req.text or req.html):
            raise HTTPException(status_code=400, detail="SMS body required")
    else:
        raise HTTPException(status_code=400, detail="Unsupported channel")

    warnings = await _enforce_consent_and_collect_warnings(db, req)
    await db.close()

    result = queue_outbox_message(
        channel=req.channel,
        to_address=req.to,
        subject=req.subject,
        html=req.html,
        text=req.text,
        attachments=[attachment.model_dump() for attachment in req.attachments or []],
        headers=req.headers,
        metadata=req.metadata,
        context=req.context,
    )

    message_id = result["id"]

    if settings.feature_flags.use_inline_sequence_runner:
        deliver_outbox_message(message_id)
    else:
        deliver_task.delay(message_id)

    return OutboxSendResponse(
        id=message_id,
        status=result.get("status", "queued"),
        shortlinks=result.get("shortlinks", []),
        warnings=warnings,
    )
