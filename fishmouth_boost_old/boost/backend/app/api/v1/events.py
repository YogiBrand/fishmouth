# boost/backend/app/api/v1/events.py
from fastapi import APIRouter, Request, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
router = APIRouter(prefix="/api/v1/events", tags=["events"])

class ClientEvent(BaseModel):
    type: str
    lead_id: Optional[str] = None
    report_id: Optional[str] = None
    payload: Dict[str, Any] = {}

@router.post("")
async def ingest(ev: ClientEvent, request: Request):
    req_id = request.headers.get("X-Request-ID")
    # TODO: insert into events table
    return {"ok": True, "request_id": req_id}
