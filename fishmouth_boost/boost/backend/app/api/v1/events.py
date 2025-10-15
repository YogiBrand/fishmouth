from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from boost.backend.lib.events import emit_event

router = APIRouter(prefix="/api/v1/events", tags=["events"])

class ClientEvent(BaseModel):
    type: str
    payload: Dict[str, Any]

@router.post("/client")
def client_event(ev: ClientEvent):
    return emit_event(ev.type, ev.payload)
