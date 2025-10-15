"""Event emission helpers with durable persistence."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.models import EventLog

log = logging.getLogger(__name__)


class EventPayload(BaseModel):
    """Pydantic payload persisted to the events table."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    source_service: str
    lead_id: Optional[str] = None
    report_id: Optional[str] = None
    call_id: Optional[str] = None
    actor: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    request_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


ALLOWED_EVENT_TYPES = {
    "report.created",
    "report.rendered",
    "report.viewed",
    "report.sent",
    "report.shared",
    "share.created",
    "share.revoked",
    "message.queued",
    "message.sent",
    "message.delivered",
    "message.opened",
    "message.clicked",
    "message.bounced",
    "message.failed",
    "sequence.step_completed",
    "lead.scored",
    "call.completed",
    "asset.uploaded",
    "marketing.signup_claimed",
}


def _resolve_session(db_session: Any) -> Session:
    if isinstance(db_session, Session):
        return db_session
    if hasattr(db_session, "session"):
        session = getattr(db_session, "session")
        if isinstance(session, Session):
            return session
    raise TypeError("emit_event expects a SQLAlchemy Session or DatabaseSession")


def emit_event(db_session: Any, event: EventPayload) -> str:
    """Persist an event and return its ID."""

    if event.type not in ALLOWED_EVENT_TYPES:
        raise ValueError(f"Unsupported event type: {event.type}")

    session = _resolve_session(db_session)
    normalized_payload = _normalize_payload(event.payload)
    record = EventLog(
        id=event.id,
        type=event.type,
        source_service=event.source_service,
        lead_id=event.lead_id,
        report_id=event.report_id,
        call_id=event.call_id,
        actor=event.actor,
        payload=normalized_payload,
        request_id=event.request_id,
        created_at=event.created_at,
    )
    session.add(record)
    session.flush()

    log.info("event.emit", extra={"event": {**event.model_dump(), "payload": normalized_payload}})
    return record.id


def _normalize_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure payload data is JSON serializable for storage."""

    try:
        return json.loads(json.dumps(payload, default=str))
    except (TypeError, ValueError):
        sanitized: Dict[str, Any] = {}
        for key, value in payload.items():
            if isinstance(value, dict):
                sanitized[key] = _normalize_payload(value)
            elif isinstance(value, list):
                sanitized[key] = [
                    _normalize_payload(item) if isinstance(item, dict) else _normalize_value(item)
                    for item in value
                ]
            else:
                sanitized[key] = _normalize_value(value)
        return sanitized


def _normalize_value(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)
