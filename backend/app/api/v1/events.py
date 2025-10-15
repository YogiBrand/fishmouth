from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.lib import EventPayload, emit_event
from services.sequence_service import SequenceEventProcessor

router = APIRouter(prefix="/api/v1/events", tags=["events"])


class ClientEvent(BaseModel):
    type: str
    lead_id: Optional[str] = None
    report_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    actor: Optional[str] = None
    source_service: Optional[str] = None


@router.post("", status_code=201)
async def ingest(ev: ClientEvent, request: Request) -> Dict[str, str]:
    db = await get_db()
    try:
        request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")
        if not request_id:
            request_id = str(uuid.uuid4())

        event_payload = EventPayload(
            type=ev.type,
            source_service=ev.source_service or "client.api",
            lead_id=ev.lead_id,
            report_id=ev.report_id,
            payload=ev.payload,
            actor=ev.actor,
            request_id=request_id,
        )
        emit_event(db.session, event_payload)
        sequence_result = SequenceEventProcessor.handle_event(
            ev.type,
            ev.lead_id,
            ev.payload,
            db.session,
        )
        await db.commit()
        return {
            "ok": True,
            "event_id": event_payload.id,
            "request_id": request_id,
            "sequence": sequence_result,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        await db.close()
