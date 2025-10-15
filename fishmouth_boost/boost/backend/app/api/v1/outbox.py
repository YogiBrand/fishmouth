from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
from boost.backend.services.messaging.email_sendgrid import send_email_sendgrid
from boost.backend.services.messaging.sms_telnyx import send_sms_telnyx
from boost.backend.services.messaging.shortlinks import create_shortlink
from boost.backend.lib.events import emit_event

router = APIRouter(prefix="/api/v1/outbox", tags=["outbox"])

OUTBOX: Dict[str, Dict[str, Any]] = {}

class SendRequest(BaseModel):
    channel: str  # email | sms
    to: str
    subject: Optional[str] = None
    html: Optional[str] = None
    text: Optional[str] = None
    report_share_url: Optional[str] = None

@router.post("/send")
def send(req: SendRequest):
    if req.channel not in ("email", "sms"):
        raise HTTPException(status_code=400, detail="invalid channel")
    message_id = str(len(OUTBOX) + 1)
    if req.channel == "email":
        res = send_email_sendgrid(req.to, req.subject or "(no subject)", req.html or req.text or "")
    else:
        msg = req.text or req.html or ""
        if req.report_share_url:
            code = create_shortlink(req.report_share_url)
            msg = f"{msg} https://your-domain.example/l/{code}"
        res = send_sms_telnyx(req.to, msg)
    OUTBOX[message_id] = {"status": res.get("status"), "provider": res.get("provider"), "provider_id": res.get("provider_id")}
    emit_event("message.sent", {"channel": req.channel, "to": req.to, "message_id": message_id, "provider": res.get("provider")})
    return {"id": message_id, **OUTBOX[message_id]}

@router.get("/{message_id}")
def status(message_id: str):
    m = OUTBOX.get(message_id)
    if not m:
        raise HTTPException(status_code=404, detail="not found")
    return {"id": message_id, **m}
