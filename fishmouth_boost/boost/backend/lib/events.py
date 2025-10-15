# boost/backend/lib/events.py
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
import uuid
import logging
log = logging.getLogger(__name__)

class Event(BaseModel):
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

ALLOWED = {
    "report.created","report.rendered","report.viewed","report.sent",
    "message.sent","message.delivered","message.opened","message.clicked","message.bounced",
    "sequence.step_completed","lead.scored","call.completed","asset.uploaded"
}

def emit_event(db_session, ev: Event):
    if ev.type not in ALLOWED:
        raise ValueError(f"Unsupported event type: {ev.type}")
    # TODO integrate with ORM/DB insert
    log.info("event_emit", extra={"event": ev.model_dump()})
    return ev.id
