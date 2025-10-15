import pytest

from app.core.database import DatabaseSession
from app.services import template_service
from database import Base, SessionLocal, engine
from models import Lead, Template, User, LeadPriority, LeadStatus


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        session.query(Template).delete()
        session.query(Lead).delete()
        session.query(User).delete()
        session.commit()
    finally:
        session.close()
    yield


@pytest.mark.asyncio
async def test_template_preview_reports_missing_tokens():
    session = SessionLocal()
    try:
        user = User(email="preview@example.com", hashed_password="pw", company_name="Preview Roofing")
        session.add(user)
        session.commit()
        session.refresh(user)

        lead = Lead(
            user_id=user.id,
            address="100 Test Lane",
            city="Austin",
            state="TX",
            zip_code="78701",
            homeowner_name="Jamie Rivers",
            lead_score=82.0,
            priority=LeadPriority.HOT,
            status=LeadStatus.NEW,
        )
        session.add(lead)
        session.commit()
        session.refresh(lead)

        template = Template(
            id="email.follow_up",
            scope="email",
            content="Hi {{lead.first_name}} {{lead.last_name}}, from {{company.name}}",
            version=1,
        )
        session.add(template)
        session.commit()
    finally:
        session.close()

    db = DatabaseSession()
    try:
        result = await template_service.preview_template(
            db,
            template_id="email.follow_up",
            lead_id=str(lead.id),
        )
    finally:
        await db.close()

    assert result["resolved"].startswith("Hi Jamie")
    assert "[[lead.last_name]]" in result["resolved"]
    assert "lead.last_name" in result["unresolved_tokens"]
    assert result["unresolved_tokens"].count("lead.last_name") == 1


@pytest.mark.asyncio
async def test_save_template_increments_version():
    db = DatabaseSession()
    try:
        created = await template_service.save_template(
            db,
            template_id="sms.touchpoint",
            scope="sms",
            content="Hey {{lead.first_name}}, quick update!",
        )
        updated = await template_service.save_template(
            db,
            template_id="sms.touchpoint",
            scope="sms",
            content="Hey {{lead.first_name}}, about your roof...",
        )
        await db.commit()
    finally:
        await db.close()

    assert created["version"] == 1
    assert updated["version"] == 2
    assert "about your roof" in updated["content"]
