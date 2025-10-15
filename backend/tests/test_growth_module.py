import pytest

from database import Base, SessionLocal, engine
from models import ContractorProspect, ContractorProspectEvent, OutboxMessage
from services.growth import refresh_contractor_prospects, run_outreach_batch


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_refresh_creates_prospects():
    summary = refresh_contractor_prospects()
    session = SessionLocal()
    try:
        total = session.query(ContractorProspect).count()
    finally:
        session.close()
    assert total >= 60
    assert summary["created"] >= 60


def test_outreach_queues_messages():
    refresh_contractor_prospects()
    result = run_outreach_batch(batch_size=10, channel="email")
    session = SessionLocal()
    try:
        queued_messages = session.query(OutboxMessage).count()
        prospect_events = session.query(ContractorProspectEvent).count()
    finally:
        session.close()

    assert queued_messages == result["queued"]
    assert prospect_events >= result["queued"]
