import asyncio

import pytest

from database import Base, SessionLocal, engine
from models import Lead, LeadPriority, LeadStatus, User, VoiceCall
from services.voice_agent_service import VoiceAgentService, VoiceCallConfig
from config import get_settings


class _RetryRecorderVoiceAgent(VoiceAgentService):
    def __init__(self, config, db, event):
        super().__init__(config, db)
        self._retry_event = event

    async def _retry_call(self, call_id: str, delay: float) -> None:  # type: ignore[override]
        self._retry_event.set()


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    # Do not drop tables to avoid impacting other tests


def create_user_and_lead(session):
    user = User(email="test@example.com", hashed_password="pw")
    session.add(user)
    session.commit()
    session.refresh(user)

    lead = Lead(
        user_id=user.id,
        address="123 Test St",
        city="Austin",
        state="TX",
        zip_code="78701",
        homeowner_name="Alex Homeowner",
        homeowner_phone="+15555550100",
        priority=LeadPriority.HOT,
        status=LeadStatus.NEW,
    )
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return user, lead


@pytest.mark.asyncio
async def test_voice_agent_generates_summary():
    session = SessionLocal()
    user, lead = create_user_and_lead(session)

    service = VoiceAgentService(VoiceCallConfig(), session)
    call_id = await service.start_call(lead.id, user.id, background=False)

    call = session.query(VoiceCall).filter(VoiceCall.lead_id == lead.id).first()
    assert call.id == call_id
    assert call.status == "completed"
    assert call.ai_summary is not None
    assert call.next_steps
    assert call.total_cost >= 0
    assert len(call.turns) > 0
    assert call.call_control_id
    assert call.carrier == "telnyx"


@pytest.mark.asyncio
async def test_voice_agent_respects_opt_out():
    session = SessionLocal()
    user, lead = create_user_and_lead(session)
    lead.voice_opt_out = True
    session.commit()

    service = VoiceAgentService(VoiceCallConfig(), session)
    with pytest.raises(PermissionError):
        await service.start_call(lead.id, user.id, background=False)


@pytest.mark.asyncio
async def test_voice_agent_failover_schedules_retry():
    session = SessionLocal()
    user, lead = create_user_and_lead(session)

    call = VoiceCall(
        id="call-fail",
        user_id=user.id,
        lead_id=lead.id,
        call_control_id="cc-fail",
        status="in_progress",
    )
    session.add(call)
    session.commit()

    settings = get_settings()
    original_attempts = settings.pipeline_resilience.provider_retry_attempts
    settings.pipeline_resilience.provider_retry_attempts = 1

    retry_event = asyncio.Event()
    service = _RetryRecorderVoiceAgent(VoiceCallConfig(), session, retry_event)

    try:
        service._handle_pipeline_failure(session, call, "network_error")

        await asyncio.wait_for(retry_event.wait(), timeout=0.2)
        session.refresh(call)
        assert call.retry_attempts == 1
        assert call.status == "retrying"

        # Exceed max attempts to ensure failure is recorded without retry
        retry_event.clear()
        call.retry_attempts = 1
        call.status = "in_progress"
        call.last_error_at = None
        session.commit()

        service._handle_pipeline_failure(session, call, "carrier_failure")
        session.refresh(call)
        assert call.status == "failed"
        assert not retry_event.is_set()
    finally:
        settings.pipeline_resilience.provider_retry_attempts = original_attempts
