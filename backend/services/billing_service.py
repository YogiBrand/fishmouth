"""Helpers for tracking billing usage metrics and admin summaries."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from models import BillingUsage, User
from services.billing_stripe import report_usage as stripe_report_usage

VOICE_MINUTE_COST = 0.18 / 60  # $0.18 per minute -> per second cost
SMS_COST = 0.01
EMAIL_COST = 0.002
PLATFORM_MARGIN_RATE = 0.18


def record_usage(
    db: Session,
    *,
    user_id: int,
    metric: str,
    quantity: float,
    cost_override: Optional[float] = None,
    metadata: Optional[dict] = None,
) -> None:
    """Increment usage counters for billing dashboards and Stripe."""

    if quantity <= 0:
        return

    result = db.execute(
        select(BillingUsage).where(
            BillingUsage.user_id == user_id,
            BillingUsage.day == date.today(),
            BillingUsage.metric == metric,
        )
    ).scalars().first()

    if not result:
        result = BillingUsage(user_id=user_id, day=date.today(), metric=metric)
        db.add(result)

    result.quantity += quantity
    if cost_override is not None:
        result.cost_usd += cost_override
    else:
        if metric == "voice_seconds":
            result.cost_usd += quantity * VOICE_MINUTE_COST
        elif metric == "sms_sent":
            result.cost_usd += quantity * SMS_COST
        elif metric == "emails_sent":
            result.cost_usd += quantity * EMAIL_COST

    if metadata:
        current = result.details or {}
        current.update(metadata)
        result.details = current

    user = db.execute(select(User).filter(User.id == user_id)).scalars().first()
    if user and user.stripe_subscription_item_id:
        stripe_quantity = quantity
        if metric == "voice_seconds":
            stripe_quantity = max(1, int((quantity + 59) // 60))
        stripe_report_usage(user, metric, stripe_quantity)


def calculate_platform_margin(cost_usd: float) -> float:
    return round(cost_usd * PLATFORM_MARGIN_RATE, 4)


def get_billing_summary(db: Session, *, days: int = 30) -> Dict:
    since = date.today() - timedelta(days=days - 1)
    rows: List[BillingUsage] = (
        db.query(BillingUsage)
        .filter(BillingUsage.day >= since)
        .order_by(BillingUsage.day.asc())
        .all()
    )

    total_cost = sum(row.cost_usd for row in rows)
    margin_amount = calculate_platform_margin(total_cost)
    provider_cost = max(0.0, total_cost - margin_amount)

    metric_totals: Dict[str, float] = {
        "voice_seconds": 0.0,
        "sms_sent": 0.0,
        "emails_sent": 0.0,
    }

    daily: Dict[str, Dict[str, float]] = {}
    for row in rows:
        metric_totals[row.metric] = metric_totals.get(row.metric, 0.0) + row.quantity
        entry = daily.setdefault(
            row.day.isoformat(),
            {
                "day": row.day.isoformat(),
                "revenue": 0.0,
                "voice_cost": 0.0,
                "sms_cost": 0.0,
                "email_cost": 0.0,
            },
        )
        entry["revenue"] += row.cost_usd
        if row.metric == "voice_seconds":
            entry["voice_cost"] += row.cost_usd
        elif row.metric == "sms_sent":
            entry["sms_cost"] += row.cost_usd
        elif row.metric == "emails_sent":
            entry["email_cost"] += row.cost_usd

    daily_breakdown = list(daily.values())

    top_users_raw = (
        db.query(BillingUsage.user_id, func.sum(BillingUsage.cost_usd).label("total"))
        .filter(BillingUsage.day >= since)
        .group_by(BillingUsage.user_id)
        .order_by(func.sum(BillingUsage.cost_usd).desc())
        .limit(5)
        .all()
    )

    user_ids = [row.user_id for row in top_users_raw]
    if user_ids:
        user_map = {user.id: user.email for user in db.query(User).filter(User.id.in_(user_ids)).all()}
    else:
        user_map = {}

    top_users = [
        {
            "user_id": row.user_id,
            "email": user_map.get(row.user_id),
            "spend": round(row.total, 2),
        }
        for row in top_users_raw
    ]

    return {
        "total_revenue": round(total_cost, 2),
        "platform_margin_rate": PLATFORM_MARGIN_RATE,
        "platform_margin": round(margin_amount, 2),
        "provider_cost": round(provider_cost, 2),
        "metrics": metric_totals,
        "daily_breakdown": daily_breakdown,
        "top_users": top_users,
        "since": since.isoformat(),
        "days": days,
    }


def aggregate_usage_for_period(db: Session, *, start: date, end: date) -> Dict[int, Dict[str, float]]:
    rows: List[BillingUsage] = (
        db.query(BillingUsage)
        .filter(BillingUsage.day >= start, BillingUsage.day <= end)
        .order_by(BillingUsage.user_id)
        .all()
    )

    aggregates: Dict[int, Dict[str, float]] = {}
    for row in rows:
        entry = aggregates.setdefault(
            row.user_id,
            {
                "voice_seconds": 0.0,
                "sms_sent": 0.0,
                "emails_sent": 0.0,
                "cost_usd": 0.0,
            },
        )
        entry["cost_usd"] += row.cost_usd
        entry[row.metric] = entry.get(row.metric, 0.0) + row.quantity

    return aggregates
