import pytest
from datetime import datetime, timedelta

from database import Base, SessionLocal, engine
from models import (
    BillingUsage,
    EventLog,
    FollowUpTask,
    Lead,
    LeadPriority,
    LeadStatus,
    Report,
    User,
)
from app.services.dashboard_service import DashboardService


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        session.query(EventLog).delete()
        session.query(FollowUpTask).delete()
        session.query(BillingUsage).delete()
        session.query(Report).delete()
        session.query(Lead).delete()
        session.query(User).delete()
        session.commit()
        yield
    finally:
        session.close()


@pytest.mark.asyncio
async def test_dashboard_summary_includes_kpis_and_lead_queue():
    session = SessionLocal()
    try:
        user = User(email='kpi@example.com', hashed_password='pw')
        session.add(user)
        session.commit()
        session.refresh(user)

        now = datetime.utcnow()
        hot_lead = Lead(
            user_id=user.id,
            address='100 Roofer Way',
            city='Austin',
            state='TX',
            zip_code='78701',
            homeowner_name='Hot Prospect',
            lead_score=92,
            priority=LeadPriority.HOT,
            status=LeadStatus.CONTACTED,
            created_at=now,
            updated_at=now,
        )
        warm_lead = Lead(
            user_id=user.id,
            address='200 Warm St',
            city='Austin',
            state='TX',
            zip_code='78702',
            homeowner_name='Warm Prospect',
            lead_score=74,
            priority=LeadPriority.WARM,
            status=LeadStatus.CONTACTED,
            created_at=now,
            updated_at=now,
        )
        appointment_lead = Lead(
            user_id=user.id,
            address='300 Appointment Ave',
            city='Austin',
            state='TX',
            zip_code='78703',
            homeowner_name='Booked Prospect',
            lead_score=88,
            priority=LeadPriority.HOT,
            status=LeadStatus.APPOINTMENT_SCHEDULED,
            created_at=now - timedelta(days=3),
            updated_at=now,
        )
        session.add_all([hot_lead, warm_lead, appointment_lead])
        session.commit()
        session.refresh(hot_lead)

        report = Report(
            id='rep-test-1',
            lead_id=hot_lead.id,
            type='analysis',
            config={},
            content={},
            business_profile={},
            sent_at=now - timedelta(days=1),
            viewed_at=now - timedelta(hours=2),
        )
        session.add(report)

        event_view = EventLog(
            type='report.viewed',
            source_service='test',
            lead_id=hot_lead.id,
            report_id='rep-test-1',
            payload={'context': 'test'},
            created_at=now - timedelta(hours=2),
        )
        event_click = EventLog(
            type='message.clicked',
            source_service='test',
            lead_id=hot_lead.id,
            payload={'context': 'click'},
            created_at=now - timedelta(hours=3),
        )
        session.add_all([event_view, event_click])

        follow_up = FollowUpTask(
            lead_id=hot_lead.id,
            task_type='call_follow_up',
            scheduled_for=now + timedelta(hours=4),
            created_at=now,
        )
        session.add(follow_up)

        usage = BillingUsage(
            user_id=user.id,
            day=now.date(),
            metric='voice_minutes',
            quantity=15,
            cost_usd=6.0,
        )
        session.add(usage)
        session.commit()
    finally:
        session.close()

    summary = await DashboardService.fetch_summary(lead_limit=10)

    assert summary['kpis']['hot_leads_today']['value'] >= 1
    assert summary['kpis']['reports_sent_7d']['value'] >= 1
    assert summary['kpis']['replies_7d']['value'] >= 1

    hot_bucket = summary['lead_queue'].get('hot', {})
    assert hot_bucket.get('leads'), 'Expected hot lead bucket to contain leads'

    usage_summary = summary['usage']
    assert usage_summary.get('voice_minutes', {}).get('quantity') == 15

    roi = summary['roi']
    assert roi['spend_last_30'] >= 6.0

    assert isinstance(summary['clusters'], list)
