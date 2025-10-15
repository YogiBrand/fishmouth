import asyncio
from datetime import datetime, timedelta

import pytest

from database import Base, SessionLocal, engine
from models import (
    Lead,
    LeadStatus,
    OutboxMessage,
    Sequence,
    SequenceEnrollment,
    SequenceHistory,
    SequenceNode,
    SequenceNodeType,
    User,
)
from services.sequence_service import SequenceEventProcessor, SequenceExecutor, SequenceService


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def _create_user_and_lead(session):
    user = User(email="tester@example.com", hashed_password="hashed")
    session.add(user)
    session.commit()
    session.refresh(user)

    lead = Lead(
        user_id=user.id,
        address="123 Demo St",
        city="Austin",
        state="TX",
        zip_code="73301",
        lead_score=88.0,
        status=LeadStatus.NEW,
        homeowner_email="lead@example.com",
        homeowner_phone="+15555550100",
    )
    session.add(lead)
    session.commit()
    session.refresh(lead)
    return user, lead


def _persist_sequence(session, user_id, flow_data):
    sequence = Sequence(
        user_id=user_id,
        name="Test Sequence",
        description="Auto-generated for testing",
        is_active=True,
        flow_data=flow_data,
    )
    session.add(sequence)
    session.commit()
    session.refresh(sequence)

    for node in flow_data["nodes"]:
        session.add(
            SequenceNode(
                sequence_id=sequence.id,
                node_id=node["id"],
                node_type=SequenceNodeType(node["type"]),
                position_x=node.get("position", {}).get("x", 0),
                position_y=node.get("position", {}).get("y", 0),
                config=node.get("data", {}),
            )
        )
    session.commit()
    return sequence


def test_sequence_flow_records_history():
    session = SessionLocal()
    user, lead = _create_user_and_lead(session)

    flow_data = {
        "nodes": [
            {"id": "start", "type": "start", "position": {"x": 0, "y": 0}, "data": {}},
            {
                "id": "wait_short",
                "type": "wait",
                "position": {"x": 200, "y": 0},
                "data": {"delay_seconds": 0},
            },
            {
                "id": "email_step",
                "type": "email",
                "position": {"x": 400, "y": 0},
                "data": {
                    "use_ai_writer": False,
                    "subject": "Welcome",
                    "body": "Thanks for checking in!",
                },
            },
            {
                "id": "wait_again",
                "type": "wait",
                "position": {"x": 600, "y": 0},
                "data": {"delay_seconds": 0},
            },
            {
                "id": "sms_step",
                "type": "sms",
                "position": {"x": 800, "y": 0},
                "data": {
                    "use_ai_writer": False,
                    "message": "Quick reminder — let's confirm your inspection.",
                },
            },
            {
                "id": "end",
                "type": "end",
                "position": {"x": 1000, "y": 0},
                "data": {"outcome": "completed"},
            },
        ],
        "edges": [
            {"id": "e1", "source": "start", "target": "wait_short"},
            {"id": "e2", "source": "wait_short", "target": "email_step"},
            {"id": "e3", "source": "email_step", "target": "wait_again"},
            {"id": "e4", "source": "wait_again", "target": "sms_step"},
            {"id": "e5", "source": "sms_step", "target": "end"},
        ],
    }

    sequence = _persist_sequence(session, user.id, flow_data)

    enrollment = SequenceService.enroll_lead_in_sequence(lead.id, sequence.id, user.id, session)

    asyncio.run(SequenceExecutor.process_pending_steps(session))
    session.refresh(enrollment)

    assert enrollment.status == "completed"
    history_entries = (
        session.query(SequenceHistory)
        .filter(SequenceHistory.enrollment_id == enrollment.id)
        .order_by(SequenceHistory.created_at.asc())
        .all()
    )
    actions = [entry.action for entry in history_entries]
    assert "enrollment.created" in actions
    assert "step.email" in actions
    assert "step.sms" in actions
    assert "step.end" in actions

    messages = session.query(OutboxMessage).all()
    assert len(messages) == 2
    for message in messages:
        assert message.status == "queued"

    session.close()


def test_event_processor_routes_conditional_branch():
    session = SessionLocal()
    user, lead = _create_user_and_lead(session)

    flow_data = {
        "nodes": [
            {"id": "start", "type": "start", "position": {"x": 0, "y": 0}, "data": {}},
            {
                "id": "decision",
                "type": "condition",
                "position": {"x": 200, "y": 0},
                "data": {"event_type": "message.clicked"},
            },
            {
                "id": "converted",
                "type": "end",
                "position": {"x": 400, "y": -80},
                "data": {"outcome": "converted"},
            },
            {
                "id": "no_response",
                "type": "end",
                "position": {"x": 400, "y": 80},
                "data": {"outcome": "no_response"},
            },
        ],
        "edges": [
            {"id": "e1", "source": "start", "target": "decision"},
            {
                "id": "e2",
                "source": "decision",
                "target": "converted",
                "data": {"condition": "true"},
            },
            {
                "id": "e3",
                "source": "decision",
                "target": "no_response",
                "data": {"condition": "false"},
            },
        ],
    }

    sequence = _persist_sequence(session, user.id, flow_data)

    enrollment = SequenceService.enroll_lead_in_sequence(lead.id, sequence.id, user.id, session)
    enrollment.current_node_id = "decision"
    enrollment.next_execution_at = datetime.utcnow()
    session.add(enrollment)
    session.commit()

    SequenceEventProcessor.handle_event(
        "message.clicked",
        lead.id,
        {"message_id": "msg-1"},
        session,
    )

    asyncio.run(SequenceExecutor.process_pending_steps(session))
    session.refresh(enrollment)

    assert enrollment.status == "completed"
    assert enrollment.conversion_outcome == "converted"

    history_entries = (
        session.query(SequenceHistory)
        .filter(SequenceHistory.enrollment_id == enrollment.id)
        .order_by(SequenceHistory.created_at.asc())
        .all()
    )
    actions = [entry.action for entry in history_entries]
    assert "event.received" in actions
    assert any(
        entry.action == "step.condition" and entry.result.get("branch") == "true"
        for entry in history_entries
    )

    session.close()
