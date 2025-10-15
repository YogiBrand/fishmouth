import pytest
from fastapi import HTTPException

from app.api.v1.outbox import OutboxSendRequest, _enforce_consent_and_collect_warnings
from app.core.database import DatabaseSession
from database import Base, SessionLocal, engine
from models import Lead, LeadPriority, LeadStatus
from services.sequence_service import SequenceExecutor


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def _stub_lead(session, **overrides):
    defaults = {
        "user_id": 1,
        "address": "10 Consent Way",
        "city": "Compliance",
        "state": "CA",
        "zip_code": "90001",
        "discovery_status": "manual",
        "imagery_status": "synthetic",
        "property_enrichment_status": "synthetic",
        "contact_enrichment_status": "synthetic",
        "status": LeadStatus.NEW,
        "lead_score": 55.0,
        "priority": LeadPriority.COLD,
    }
    defaults.update(overrides)
    lead = Lead(**defaults)
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return lead


@pytest.mark.asyncio
async def test_outbox_send_blocks_without_consent():
    session = SessionLocal()
    lead = _stub_lead(session, consent_email=False, consent_sms=False, dnc=True)
    db = DatabaseSession()
    try:
        req = OutboxSendRequest(channel="email", to="test@example.com", subject="Hello", html="<p>Hi</p>", context={"lead_id": lead.id})
        with pytest.raises(HTTPException) as exc:
            await _enforce_consent_and_collect_warnings(db, req)
        assert exc.value.status_code == 403
        assert "do-not-contact" in exc.value.detail
    finally:
        await db.close()
        session.close()


def test_sequence_consent_guard():
    lead = Lead(
        user_id=1,
        address="1 Guard Ln",
        city="Guard",
        state="NY",
        zip_code="10001",
        discovery_status="manual",
        imagery_status="synthetic",
        property_enrichment_status="synthetic",
        contact_enrichment_status="synthetic",
        status=LeadStatus.NEW,
        lead_score=40.0,
        priority=LeadPriority.COLD,
        consent_email=False,
        consent_sms=True,
        consent_voice=True,
        dnc=False,
    )

    assert SequenceExecutor._check_contact_permissions(lead, "email") == "Email consent not granted"
    lead.consent_email = True
    lead.dnc = True
    assert SequenceExecutor._check_contact_permissions(lead, "sms") == "Lead is marked as do-not-contact"
