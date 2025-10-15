"""Outreach automation for contractor prospects."""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta
from typing import Dict, Optional

from sqlalchemy import case, func

from config import get_settings
from database import SessionLocal
from models import ContractorProspect, ContractorProspectEvent
from services.outbox_service import queue_outbox_message


def _build_email_body(prospect: ContractorProspect, base_url: str) -> str:
    city = prospect.city or "your area"
    company = prospect.company_name
    gift_offer = "3 free HOT leads" if base_url else "complimentary demo"
    return (
        f"Hi {prospect.contact_name or 'there'},\n\n"
        f"I lead partnerships at Fish Mouth AI. We book roof replacements in {city} for contractors like {company}.\n"
        f"Our team is refreshing a daily homeowner pipeline and we'd like to send {gift_offer} to prove the fit.\n\n"
        f"If you're taking on hail or 15+ year replacements, let's coordinate a 12-minute walkthrough.\n"
        f"Book a slot that works for you: {{shortlink}}\n\n"
        f"– Riley, Growth @ Fish Mouth AI"
    )


def _build_sms_body(prospect: ContractorProspect) -> str:
    city = prospect.city or "your market"
    return (
        f"This is Riley w/ Fish Mouth AI. We have homeowners in {city} asking for roof help."
        f" Can I share 3 free leads to test fit?"
        f" Reply YES and I'll send a calendar link."
    )


def run_outreach_batch(batch_size: int = 25, channel: str = "email") -> Dict[str, int]:
    """Queue outreach messages for the highest scoring prospects."""

    if channel not in {"email", "sms"}:
        raise ValueError("Channel must be 'email' or 'sms'")

    session = SessionLocal()
    queued = 0
    skipped = 0
    now = datetime.utcnow()
    settings = get_settings()
    base_url = str(settings.base_url) if settings.base_url else ""

    try:
        priority_order = case(
            (ContractorProspect.next_contact_at == None, 0),  # noqa: E711
            else_=1,
        )
        prospects = (
            session.query(ContractorProspect)
            .filter(ContractorProspect.status.in_(["new", "queued", "contacted"]))
            .order_by(
                priority_order,
                ContractorProspect.next_contact_at.asc(),
                func.coalesce(ContractorProspect.score, 0).desc(),
            )
            .limit(batch_size)
            .all()
        )

        for prospect in prospects:
            if channel == "email" and not prospect.email:
                skipped += 1
                continue
            if channel == "sms" and not prospect.phone:
                skipped += 1
                continue

            context = {
                "prospect_id": str(prospect.id),
                "company_name": prospect.company_name,
                "city": prospect.city,
                "state": prospect.state,
            }
            metadata = {
                "source": prospect.source,
                "sequence_stage": prospect.sequence_stage,
            }

            if channel == "email":
                subject = f"{prospect.city or 'Roof'} leads ready for {prospect.company_name}"
                text_body = _build_email_body(prospect, base_url)
                message = queue_outbox_message(
                    channel="email",
                    to_address=prospect.email,
                    subject=subject,
                    html=None,
                    text=text_body,
                    metadata=metadata,
                    context=context,
                )
            else:
                text_body = _build_sms_body(prospect)
                message = queue_outbox_message(
                    channel="sms",
                    to_address=prospect.phone,
                    text=text_body,
                    metadata=metadata,
                    context=context,
                )

            prospect.status = "contacted"
            prospect.sequence_stage = (prospect.sequence_stage or 0) + 1
            prospect.last_contacted_at = now
            prospect.next_contact_at = now + timedelta(days=3)

            event = ContractorProspectEvent(
                prospect_id=prospect.id,
                type="outreach.sent",
                payload={
                    "channel": channel,
                    "outbox_id": message["id"],
                    "sequence_stage": prospect.sequence_stage,
                },
            )
            session.add(event)
            queued += 1

        session.commit()
        return {"queued": queued, "skipped": skipped}
    finally:
        session.close()


def record_prospect_reply(
    prospect_id: str,
    *,
    reply_type: str,
    note: Optional[str] = None,
) -> bool:
    """Record downstream events such as replies, demos, or conversion."""

    valid_types = {"replied", "demo", "paid", "not_interested"}
    if reply_type not in valid_types:
        raise ValueError(f"Unsupported reply_type '{reply_type}'")

    session = SessionLocal()
    try:
        prospect = session.query(ContractorProspect).filter(ContractorProspect.id == prospect_id).one_or_none()
        if not prospect:
            return False

        status_map = {
            "replied": "replied",
            "demo": "demo_booked",
            "paid": "converted",
            "not_interested": "archived",
        }
        prospect.status = status_map[reply_type]
        prospect.reply_status = reply_type
        prospect.last_reply_at = datetime.utcnow()
        prospect.next_contact_at = None

        event = ContractorProspectEvent(
            prospect_id=prospect.id,
            type=f"prospect.{reply_type}",
            payload={"note": note} if note else {},
        )
        session.add(event)
        session.commit()
        return True
    finally:
        session.close()


def summarize_prospect_pipeline() -> Dict[str, object]:
    """Compute summary metrics for dashboard/reporting."""

    session = SessionLocal()
    try:
        counts = (
            session.query(ContractorProspect.status, func.count(ContractorProspect.id))
            .group_by(ContractorProspect.status)
            .all()
        )
        status_counts = {status: total for status, total in counts}

        day_cutoff = datetime.utcnow() - timedelta(days=1)
        new_today = (
            session.query(func.count(ContractorProspect.id))
            .filter(ContractorProspect.first_seen >= day_cutoff)
            .scalar()
        )
        outreach_today = (
            session.query(func.count(ContractorProspectEvent.id))
            .filter(ContractorProspectEvent.type == "outreach.sent")
            .filter(ContractorProspectEvent.occurred_at >= day_cutoff)
            .scalar()
        )

        return {
            "status_counts": status_counts,
            "new_today": new_today,
            "outreach_today": outreach_today,
        }
    finally:
        session.close()
