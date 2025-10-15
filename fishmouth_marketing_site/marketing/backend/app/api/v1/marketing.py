from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
from datetime import datetime
import re

router = APIRouter(prefix="/api/v1/marketing", tags=["marketing"])

HONEYPOT_FIELD = "website"  # bot trap

# In production, replace with DB insert logic and your event emitter
SIGNUPS: list[dict] = []

class SignupPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(None, description="E.164 preferred")
    company: str = Field(..., min_length=2, max_length=140)
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    source: Optional[str] = Field(None, description="utm_source or channel")
    medium: Optional[str] = Field(None, description="utm_medium")
    campaign: Optional[str] = Field(None, description="utm_campaign")
    notes: Optional[str] = None
    # Honeypot
    website: Optional[str] = None

def _normalize_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    digits = re.sub(r"\D+", "", phone)
    if not digits:
        return None
    if digits.startswith("1") and len(digits) == 11:
        return f"+{digits}"
    if len(digits) == 10:
        return f"+1{digits}"
    return f"+{digits}"

@router.post("/claim_free_leads")
async def claim_free_leads(req: Request, payload: SignupPayload) -> Dict[str, Any]:
    # Honeypot check
    if getattr(payload, HONEYPOT_FIELD, None):
        # Silently accept but do nothing
        return {"ok": True}

    entry = payload.dict()
    entry["phone"] = _normalize_phone(entry.get("phone"))
    entry["ip"] = req.client.host if req.client else None
    entry["user_agent"] = req.headers.get("user-agent")
    entry["created_at"] = datetime.utcnow().isoformat() + "Z"
    SIGNUPS.append(entry)

    # Emit event if your event bus exists
    try:
        from boost.backend.lib.events import emit_event  # optional: available if you merged Boost Pack
        emit_event("marketing.signup_claimed", {"email": entry["email"], "company": entry["company"], "city": entry.get("city"), "state": entry.get("state")})
    except Exception:
        pass

    return {"ok": True, "received": {"email": entry["email"], "company": entry["company"]}}
