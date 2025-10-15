import pytest
from datetime import datetime, timedelta

from database import Base, SessionLocal, engine
from models import (
    MessageEvent,
    OutboxMessage,
    Sequence,
    SequenceEnrollment,
    SequenceExecution,
    SequenceNode,
    SequenceNodeType,
    Lead,
    User,
)
from services.sequence_service import SequenceService


REQUIRED_TABLES = [
    User.__table__,
    Lead.__table__,
    Sequence.__table__,
    SequenceNode.__table__,
    SequenceEnrollment.__table__,
    SequenceExecution.__table__,
    OutboxMessage.__table__,
    MessageEvent.__table__,
]


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine, tables=REQUIRED_TABLES)
    session = SessionLocal()
    try:
        session.query(MessageEvent).delete()
        session.query(OutboxMessage).delete()
        session.query(SequenceExecution).delete()
        session.query(SequenceEnrollment).delete()
        session.query(SequenceNode).delete()
        session.query(Sequence).delete()
        session.query(Lead).delete()
        session.query(User).delete()
        session.commit()
        yield
    finally:
        session.close()


def _build_payload(sequence_id, enrollment_id, lead_id, node_id):
    return {
        "channel": "email",
        "to": "lead@example.com",
        "subject": "Step Update",
        "text": "Body",
        "html": None,
        "attachments": [],
        "headers": {},
        "metadata": {
            "sequence_id": sequence_id,
            "enrollment_id": enrollment_id,
            "lead_id": lead_id,
        },
        "context": {
            "sequence_id": sequence_id,
            "enrollment_id": enrollment_id,
            "lead_id": lead_id,
            "node_id": node_id,
        },
        "shortlinks": [],
    }


def test_sequence_analytics_summary_and_filters():
    session = SessionLocal()
    try:
        now = datetime.utcnow()

        user = User(email="analytics@example.com", hashed_password="pw")
        session.add(user)
        session.commit()
        session.refresh(user)

        sequence = Sequence(
            user_id=user.id,
            name="Roof Outreach",
            description="Test sequence",
            is_active=True,
            flow_data={
                "nodes": [
                    {"id": "start", "type": "start", "position": {"x": 100, "y": 40}, "data": {"label": "Start"}},
                    {"id": "email_1", "type": "email", "position": {"x": 260, "y": 40}, "data": {"label": "Email Step"}},
                ],
                "edges": [{"id": "edge_1", "source": "start", "target": "email_1"}],
            },
        )
        session.add(sequence)
        session.commit()
        session.refresh(sequence)

        node = SequenceNode(
            sequence_id=sequence.id,
            node_id="email_1",
            node_type=SequenceNodeType.EMAIL,
            position_x=240.0,
            position_y=60.0,
            config={"label": "Email Touch"},
        )
        session.add(node)

        lead_hot = Lead(
            user_id=user.id,
            homeowner_name="Lead One",
            homeowner_email="lead.one@example.com",
            homeowner_phone="+15555550100",
            address="123 Test St",
            city="Austin",
            state="TX",
            zip_code="78701",
            lead_score=82,
        )
        lead_old = Lead(
            user_id=user.id,
            homeowner_name="Lead Two",
            homeowner_email="lead.two@example.com",
            homeowner_phone="+15555550111",
            address="987 Legacy Rd",
            city="Austin",
            state="TX",
            zip_code="78702",
            lead_score=40,
        )
        session.add_all([lead_hot, lead_old])
        session.commit()
        session.refresh(lead_hot)
        session.refresh(lead_old)

        enrollment_recent = SequenceEnrollment(
            sequence_id=sequence.id,
            lead_id=lead_hot.id,
            user_id=user.id,
            status="completed",
            current_node_id="email_1",
            enrolled_at=now,
            completed_at=now,
        )
        enrollment_old = SequenceEnrollment(
            sequence_id=sequence.id,
            lead_id=lead_old.id,
            user_id=user.id,
            status="failed",
            current_node_id="email_1",
            enrolled_at=now - timedelta(days=45),
            completed_at=now - timedelta(days=44),
        )
        session.add_all([enrollment_recent, enrollment_old])
        session.commit()

        execution_recent = SequenceExecution(
            sequence_id=sequence.id,
            enrollment_id=enrollment_recent.id,
            node_id="email_1",
            node_type=SequenceNodeType.EMAIL,
            adapter="email",
            status="completed",
            started_at=now,
            completed_at=now,
            execution_metadata={"message_id": "msg-1", "status": "sent", "provider": "outbox"},
        )
        execution_old = SequenceExecution(
            sequence_id=sequence.id,
            enrollment_id=enrollment_old.id,
            node_id="email_1",
            node_type=SequenceNodeType.EMAIL,
            adapter="email",
            status="failed",
            started_at=now - timedelta(days=45),
            completed_at=now - timedelta(days=45),
            execution_metadata={"message_id": "msg-2", "status": "failed", "provider": "outbox"},
        )
        session.add_all([execution_recent, execution_old])

        message_recent = OutboxMessage(
            id="msg-1",
            channel="email",
            to_address=lead_hot.homeowner_email,
            subject="Roof follow-up",
            body_text="Hello",
            payload=_build_payload(sequence.id, enrollment_recent.id, lead_hot.id, "email_1"),
            status="delivered",
            sent_at=now,
            delivered_at=now,
        )
        message_failed = OutboxMessage(
            id="msg-2",
            channel="email",
            to_address=lead_old.homeowner_email,
            subject="Second touch",
            body_text="Hello",
            payload=_build_payload(sequence.id, enrollment_old.id, lead_old.id, "email_1"),
            status="failed",
            sent_at=now - timedelta(days=45),
        )
        session.add_all([message_recent, message_failed])

        events = [
            MessageEvent(message_id="msg-1", type="sent", meta={}, occurred_at=now - timedelta(minutes=2)),
            MessageEvent(message_id="msg-1", type="delivered", meta={}, occurred_at=now - timedelta(minutes=1)),
            MessageEvent(message_id="msg-1", type="opened", meta={}, occurred_at=now - timedelta(seconds=30)),
            MessageEvent(message_id="msg-1", type="clicked", meta={}, occurred_at=now - timedelta(seconds=10)),
            MessageEvent(message_id="msg-2", type="failed", meta={}, occurred_at=now - timedelta(days=45)),
        ]
        session.add_all(events)
        session.commit()

        analytics_all = SequenceService.get_sequence_analytics(
            sequence.id,
            user.id,
            session,
            filters={"timeframe": "all"},
        )

        delivery_summary = analytics_all["summary"]["delivery"]
        assert delivery_summary["messages"] == 2
        assert delivery_summary["delivered"] == 1
        assert delivery_summary["failed"] == 1
        assert delivery_summary["engaged"] == 1
        assert analytics_all["steps"]["filtered"][0]["sends"] == 2
        assert analytics_all["engagements"]["total"] == 2

        analytics_recent = SequenceService.get_sequence_analytics(
            sequence.id,
            user.id,
            session,
            filters={"timeframe": "7d"},
        )
        assert analytics_recent["summary"]["delivery"]["messages"] == 1
        assert analytics_recent["engagements"]["total"] == 1

        analytics_failed = SequenceService.get_sequence_analytics(
            sequence.id,
            user.id,
            session,
            filters={"timeframe": "all", "status": "failed"},
        )
        assert analytics_failed["summary"]["delivery"]["messages"] == 1
        assert analytics_failed["engagements"]["items"][0]["delivery"]["status"] == "failed"
    finally:
        session.close()
