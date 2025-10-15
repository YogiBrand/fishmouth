"""Public marketing endpoints for the lead giveaway campaign."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import DatabaseSession, get_db
from app.lib.events import EventPayload, emit_event
from models import MarketingSignup

router = APIRouter(prefix="/api/v1/marketing", tags=["marketing"])

HONEYPOT_FIELD = "website"  # hidden field used to catch bots


class SignupPayload(BaseModel):
    """Payload accepted by the 25 free leads campaign form."""

    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    phone: Optional[str] = Field(None, description="E.164 preferred")
    company: str = Field(..., min_length=2, max_length=140)
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    source: Optional[str] = Field(
        None, description="utm_source or marketing channel identifier"
    )
    medium: Optional[str] = Field(None, description="utm_medium attribution value")
    campaign: Optional[str] = Field(None, description="utm_campaign identifier")
    notes: Optional[str] = None
    website: Optional[str] = None  # honeypot


PHONE_DIGITS_RE = re.compile(r"\D+")


def _normalize_phone(phone: Optional[str]) -> Optional[str]:
    """Normalize phone numbers to E.164 when possible."""

    if not phone:
        return None
    digits = PHONE_DIGITS_RE.sub("", phone)
    if not digits:
        return None
    if digits.startswith("1") and len(digits) == 11:
        return f"+{digits}"
    if len(digits) == 10:
        return f"+1{digits}"
    return f"+{digits}"


@router.post(
    "/claim_free_leads",
    status_code=status.HTTP_201_CREATED,
    response_model=Dict[str, Any],
)
async def claim_free_leads(
    request: Request,
    payload: SignupPayload,
    db: DatabaseSession = Depends(get_db),
) -> Dict[str, Any]:
    """Capture marketing signups and hand them to downstream automations."""

    # Honeypot: silently accept bots without persisting
    if getattr(payload, HONEYPOT_FIELD, None):
        await db.close()
        return {"ok": True}

    normalized_phone = _normalize_phone(payload.phone)
    record = MarketingSignup(
        name=payload.name.strip(),
        email=payload.email.lower(),
        phone=normalized_phone,
        company=payload.company.strip(),
        city=(payload.city or "").strip() or None,
        state=(payload.state or "").strip() or None,
        country=(payload.country or "").strip() or None,
        source=(payload.source or "").strip() or None,
        medium=(payload.medium or "").strip() or None,
        campaign=(payload.campaign or "").strip() or None,
        notes=(payload.notes or "").strip() or None,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        created_at=datetime.utcnow(),
    )

    try:
        db.session.add(record)
        db.session.commit()
    except SQLAlchemyError as exc:  # noqa: BLE001
        db.session.rollback()
        await db.close()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to capture signup. Please try again.",
        ) from exc

    # Emit marketing event for automation hooks (best-effort)
    try:
        emit_event(
            db.session,
            EventPayload(
                type="marketing.signup_claimed",
                source_service="marketing-site",
                payload={
                    "email": record.email,
                    "company": record.company,
                    "city": record.city,
                    "state": record.state,
                    "source": record.source,
                    "medium": record.medium,
                    "campaign": record.campaign,
                },
            ),
        )
        db.session.commit()
    except Exception:  # noqa: BLE001
        db.session.rollback()
        # Silently continue—event emission is best effort

    await db.close()

    return {
        "ok": True,
        "received": {
            "email": record.email,
            "company": record.company,
            "city": record.city,
            "state": record.state,
        },
    }
