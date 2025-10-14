from datetime import date, timedelta

import pytest

from database import Base, SessionLocal, engine
from models import BillingUsage
from services.billing_service import (
    PLATFORM_MARGIN_RATE,
    aggregate_usage_for_period,
    get_billing_summary,
)


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield


def seed_usage(session):
    today = date.today()
    session.add_all(
        [
            BillingUsage(user_id=1, day=today, metric="voice_seconds", quantity=120, cost_usd=2.4),
            BillingUsage(user_id=1, day=today - timedelta(days=1), metric="sms_sent", quantity=10, cost_usd=0.1),
            BillingUsage(user_id=2, day=today, metric="emails_sent", quantity=5, cost_usd=0.05),
        ]
    )
    session.commit()


def test_billing_summary_rollup():
    session = SessionLocal()
    seed_usage(session)

    summary = get_billing_summary(session, days=3)

    assert round(summary["total_revenue"], 2) == pytest.approx(2.55, rel=1e-3)
    assert summary["metrics"]["voice_seconds"] == 120
    assert summary["metrics"]["sms_sent"] == 10
    assert summary["metrics"]["emails_sent"] == 5

    expected_margin = round(summary["total_revenue"] * PLATFORM_MARGIN_RATE, 2)
    assert round(summary["platform_margin"], 2) == pytest.approx(expected_margin, rel=1e-3)
    assert summary["days"] == 3


def test_aggregate_usage_for_period():
    session = SessionLocal()
    seed_usage(session)

    start = date.today() - timedelta(days=1)
    end = date.today()
    aggregates = aggregate_usage_for_period(session, start=start, end=end)

    assert 1 in aggregates
    assert aggregates[1]["voice_seconds"] == 120
    assert aggregates[1]["sms_sent"] == 10
    assert pytest.approx(aggregates[1]["cost_usd"], rel=1e-3) == 2.5

    assert 2 in aggregates
    assert aggregates[2]["emails_sent"] == 5
