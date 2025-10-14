"""Stripe usage-based billing helpers."""

from __future__ import annotations

import time
from typing import Optional, Tuple

import stripe

from config import get_settings
from models import User


def _configure_stripe() -> Optional[stripe]:
    secret = get_settings().providers.stripe_secret_key
    if not secret:
        return None
    stripe.api_key = secret
    return stripe


def report_usage(user: User, metric: str, quantity: float, timestamp: Optional[int] = None) -> None:
    """Send usage records to Stripe for users with subscription item IDs."""
    if quantity <= 0 or not user.stripe_subscription_item_id:
        return

    client = _configure_stripe()
    if client is None:
        return

    ts = timestamp or int(time.time())
    try:
        client.UsageRecord.create(
            subscription_item=user.stripe_subscription_item_id,
            quantity=int(quantity),
            timestamp=ts,
            action="increment",
            description=f"metric={metric}",
        )
    except Exception as exc:  # pragma: no cover - network failure path
        # We intentionally swallow failures to prevent cascading issues; billing ledger retains usage locally.
        stripe.logger.warning("Stripe usage record failed: %s", exc)


def ensure_customer(user: User) -> str:
    """Create a Stripe customer when one does not exist for the user."""

    client = _configure_stripe()
    if client is None:
        raise RuntimeError("Stripe secret key is not configured")

    if user.stripe_customer_id:
        return user.stripe_customer_id

    try:
        customer = client.Customer.create(
            email=user.email,
            name=user.full_name or user.email,
            metadata={"user_id": user.id},
        )
    except Exception as exc:  # pragma: no cover - network failure path
        raise RuntimeError(f"Failed to create Stripe customer: {exc}") from exc

    return customer["id"]


def create_subscription(customer_id: str, price_id: str) -> Tuple[str, str]:
    """Create a subscription and return (subscription_id, subscription_item_id)."""

    client = _configure_stripe()
    if client is None:
        raise RuntimeError("Stripe secret key is not configured")

    try:
        subscription = client.Subscription.create(
            customer=customer_id,
            items=[{"price": price_id}],
            payment_behavior="default_incomplete",
            expand=["items.data.price"],
        )
    except Exception as exc:  # pragma: no cover - network failure path
        raise RuntimeError(f"Failed to create Stripe subscription: {exc}") from exc

    items = subscription.get("items", {}).get("data", [])
    if not items:
        raise RuntimeError("Subscription was created without items")

    return subscription["id"], items[0]["id"]
