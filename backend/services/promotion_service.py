"""Wallet promotion management helpers."""

from __future__ import annotations

import asyncio
import logging
import secrets
import string
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from celery_app import celery_app
from config import get_settings
from database import SessionLocal
from models import User, WalletPromotion
from services.outbox_service import deliver_outbox_message, queue_outbox_message

logger = logging.getLogger("services.promotions")


def _promo_alphabet() -> str:
    return "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def generate_code(length: int = 10) -> str:
    alphabet = _promo_alphabet()
    return "".join(secrets.choice(alphabet) for _ in range(length))


def serialize_promotion(promotion: WalletPromotion) -> Dict[str, object]:
    return {
        "id": promotion.id,
        "code": promotion.code,
        "multiplier": promotion.multiplier,
        "reward_type": promotion.reward_type,
        "trigger_source": promotion.trigger_source,
        "status": promotion.status,
        "metadata": promotion.promo_metadata or {},
        "created_at": promotion.created_at.isoformat() if promotion.created_at else None,
        "updated_at": promotion.updated_at.isoformat() if promotion.updated_at else None,
        "expires_at": promotion.expires_at.isoformat() if promotion.expires_at else None,
        "redeemed_at": promotion.redeemed_at.isoformat() if promotion.redeemed_at else None,
        "locked_at": promotion.locked_at.isoformat() if promotion.locked_at else None,
        "viewed_at": promotion.viewed_at.isoformat() if promotion.viewed_at else None,
        "extension_count": promotion.extension_count or 0,
        "triggered_level": promotion.triggered_level,
        "lock_amount": promotion.lock_amount,
        "status_reason": promotion.status_reason,
    }


def _send_email(
    promotion: WalletPromotion,
    user: User,
    *,
    subject: str,
    html_body: str,
    text_body: str,
) -> None:
    settings = get_settings()
    if not user.email:
        logger.info("wallet_promo.no_email", user_id=user.id, promotion_id=promotion.id)
        return

    metadata = {
        "promotion_id": promotion.id,
        "promotion_code": promotion.code,
        "promotion_status": promotion.status,
    }
    context = {
        "promotion_id": promotion.id,
        "promotion_code": promotion.code,
        "promotion_multiplier": promotion.multiplier,
    }
    result = queue_outbox_message(
        channel="email",
        to_address=user.email,
        subject=subject,
        html=html_body,
        text=text_body,
        metadata=metadata,
        context=context,
    )

    if settings.feature_flags.use_inline_sequence_runner:
        try:
            deliver_outbox_message(result["id"])
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("wallet_promo.email_deliver_failed", extra={"error": str(exc), "promotion_id": promotion.id})


def _promotion_call_to_action(code: str, multiplier: float) -> str:
    return f"Use code {code} at checkout to receive {multiplier:.0f}× wallet credits."


def _build_initial_email(promotion: WalletPromotion, user: User) -> Dict[str, str]:
    multiplier = promotion.multiplier
    headline = f"Fast bonus unlocked: {multiplier:.0f}× wallet credits for the next 30 minutes"
    cta = _promotion_call_to_action(promotion.code, multiplier)
    html = f"""
        <p>Hi {user.full_name or user.email},</p>
        <p>You just unlocked a limited-time reward. For the next 30 minutes any wallet reload is doubled instantly.</p>
        <p><strong>Promotion Code:</strong> {promotion.code}</p>
        <p>{cta}</p>
        <p>Reload any amount — $50 becomes ${int(50 * multiplier)} in credits. Funds land immediately after Stripe confirms payment.</p>
        <p>Keep scaling,<br/>Fish Mouth AI</p>
    """
    text = (
        f"Hi {user.full_name or user.email},\n\n"
        f"You unlocked a {multiplier:.0f}x wallet boost for the next 30 minutes.\n"
        f"Promotion Code: {promotion.code}\n"
        f"{cta}\n\n"
        "Reload any amount and we double it as soon as Stripe confirms payment.\n\n"
        "Keep scaling,\nFish Mouth AI"
    )
    return {"subject": headline, "html": html, "text": text}


def _build_extension_email(promotion: WalletPromotion, user: User) -> Dict[str, str]:
    multiplier = promotion.multiplier
    headline = f"Extended: {multiplier:.0f}× wallet credits — 24-hour second chance"
    cta = _promotion_call_to_action(promotion.code, multiplier)
    html = f"""
        <p>Hi {user.full_name or user.email},</p>
        <p>We saved your promotion. You now have 24 hours to double any wallet reload.</p>
        <p><strong>New Promotion Code:</strong> {promotion.code}</p>
        <p>{cta}</p>
        <p>Book the crew, reload the wallet, and keep momentum rolling.</p>
        <p>Let’s close the next roof,<br/>Fish Mouth AI</p>
    """
    text = (
        f"Hi {user.full_name or user.email},\n\n"
        f"Promotion extended: {multiplier:.0f}x wallet credits for the next 24 hours.\n"
        f"Promotion Code: {promotion.code}\n"
        f"{cta}\n\n"
        "Reload any amount today — we double it instantly.\n\n"
        "Keep momentum,\nFish Mouth AI"
    )
    return {"subject": headline, "html": html, "text": text}


def _build_reminder_email(promotion: WalletPromotion, user: User) -> Dict[str, str]:
    settings = get_settings()
    multiplier = promotion.multiplier
    portal_url = (settings.frontend_url or '').rstrip('/') or 'https://app.fishmouth.ai'
    wallet_link = f"{portal_url}/dashboard?walletPromo={promotion.code}"
    headline = f"Last call: {multiplier:.0f}× wallet credits — 1 hour left"
    cta = _promotion_call_to_action(promotion.code, multiplier)
    html = f"""
        <p>Hi {user.full_name or user.email},</p>
        <p>Your wallet boost is almost over. Reload within the next hour and we double it instantly.</p>
        <p><strong>Promotion Code:</strong> {promotion.code}</p>
        <p>{cta}</p>
        <p><a href="{wallet_link}">Open your wallet with the promo applied</a> and add any amount before the timer ends.</p>
        <p>Keep leads flowing,<br/>Fish Mouth AI</p>
    """
    text = (
        f"Hi {user.full_name or user.email},\n\n"
        f"Your {multiplier:.0f}× wallet boost expires in one hour.\n"
        f"Promotion Code: {promotion.code}\n"
        f"{cta}\n\n"
        f"Open your wallet to reload now: {wallet_link}\n\n"
        "Keep leads flowing,\nFish Mouth AI"
    )
    return {"subject": headline, "html": html, "text": text}


def expire_outdated(session: Session, promotions: Iterable[WalletPromotion]) -> None:
    now = datetime.utcnow()
    for promotion in promotions:
        if promotion.status in {"redeemed", "cancelled"}:
            continue
        if promotion.expires_at and promotion.expires_at < now:
            promotion.status = "expired"
            promotion.status_reason = "expired"
            promotion.updated_at = now
            session.add(promotion)


def list_promotions(session: Session, user: User) -> List[WalletPromotion]:
    promotions = (
        session.query(WalletPromotion)
        .filter(WalletPromotion.user_id == user.id)
        .order_by(WalletPromotion.created_at.desc())
        .all()
    )
    expire_outdated(session, promotions)
    return promotions


def _ensure_unique_code(session: Session) -> str:
    attempts = 0
    while attempts < 5:
        attempts += 1
        code = generate_code()
        exists = (
            session.query(WalletPromotion)
            .filter(WalletPromotion.code == code)
            .first()
        )
        if not exists:
            return code
    raise RuntimeError("Unable to generate unique promotion code")


def create_double_credit_promotion(
    session: Session,
    *,
    user: User,
    level: int,
    trigger_source: str = "level_up",
    context: Optional[Dict[str, object]] = None,
) -> WalletPromotion:
    """Create or return the active double-credit promotion for the user."""

    existing_active = (
        session.query(WalletPromotion)
        .filter(
            WalletPromotion.user_id == user.id,
            WalletPromotion.reward_type == "double_wallet_credit",
            WalletPromotion.status.in_(["active", "pending_checkout"]),
        )
        .order_by(WalletPromotion.created_at.desc())
        .first()
    )
    if existing_active:
        # Refresh expiry if necessary
        expire_outdated(session, [existing_active])
        return existing_active

    cumulative_reload = float(context.get("wallet_reload_total", 0.0)) if context else 0.0
    force_issue = bool(context.get("force")) if context else False

    if not force_issue:
        if level < 4:
            raise ValueError("Level requirement not met for promotion issuance")
        if cumulative_reload > 0:
            raise ValueError("Promotion reserved for accounts without existing wallet spend")

    code = _ensure_unique_code(session)
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=4)
    metadata = {
        "wallet_reload_total": cumulative_reload,
        "source": trigger_source,
        "level": level,
        "recommended_amount": 250 if cumulative_reload <= 0 else 500,
        "force": force_issue,
    }

    promotion = WalletPromotion(
        user_id=user.id,
        code=code,
        multiplier=2.0,
        reward_type="double_wallet_credit",
        trigger_source=trigger_source,
        status="active",
        promo_metadata=metadata,
        created_at=now,
        updated_at=now,
        expires_at=expires_at,
        triggered_level=level,
    )
    session.add(promotion)
    session.flush()
    logger.info(
        "wallet_promo.created",
        extra={"promotion_id": promotion.id, "user_id": user.id, "level": level, "code": code, "trigger": trigger_source},
    )
    email_payload = _build_initial_email(promotion, user)
    _send_email(promotion, user, subject=email_payload["subject"], html_body=email_payload["html"], text_body=email_payload["text"])
    delta_seconds = max(0, int((expires_at - now).total_seconds()))
    if delta_seconds:
        _schedule_extension(promotion.id, delay_seconds=delta_seconds)
        reminder_delay = max(0, delta_seconds - 3600)
        if reminder_delay > 0:
            _schedule_reminder_email(promotion.id, reminder_delay)
    return promotion


def _schedule_extension(promotion_id: int, delay_seconds: int) -> None:
    try:
        celery_app.send_task(
            "tasks.promotion_tasks.extend_window",
            args=[promotion_id],
            countdown=delay_seconds,
        )
    except Exception as exc:  # pragma: no cover - best effort
        logger.warning("wallet_promo.schedule_extension_failed", extra={"error": str(exc), "promotion_id": promotion_id})


def _schedule_reminder_email(promotion_id: int, delay_seconds: int) -> None:
    if delay_seconds <= 0:
        delay_seconds = 0
    try:
        celery_app.send_task(
            "tasks.promotion_tasks.send_reminder",
            args=[promotion_id],
            countdown=delay_seconds,
        )
    except Exception as exc:  # pragma: no cover - best effort
        logger.warning("wallet_promo.schedule_reminder_failed", extra={"error": str(exc), "promotion_id": promotion_id})


def mark_viewed(session: Session, promotion: WalletPromotion) -> WalletPromotion:
    if promotion.viewed_at:
        return promotion
    promotion.viewed_at = datetime.utcnow()
    promotion.updated_at = promotion.viewed_at
    session.add(promotion)
    return promotion


def lock_promotion(session: Session, promotion: WalletPromotion, *, amount: Optional[float] = None) -> WalletPromotion:
    if promotion.status not in {"active", "pending_checkout"}:
        raise ValueError("Promotion is no longer available")
    promotion.status = "pending_checkout"
    promotion.locked_at = datetime.utcnow()
    promotion.lock_amount = amount
    promotion.updated_at = promotion.locked_at
    session.add(promotion)
    return promotion


def redeem_promotion(
    session: Session,
    promotion: WalletPromotion,
    *,
    amount: float,
    credit_amount: float,
    metadata: Optional[Dict[str, object]] = None,
) -> WalletPromotion:
    expire_outdated(session, [promotion])
    if promotion.status in {"expired", "cancelled"}:
        raise ValueError("Promotion has expired")
    now = datetime.utcnow()
    promotion.status = "redeemed"
    promotion.redeemed_at = now
    promotion.updated_at = now
    promotion.status_reason = "redeemed"
    promotion.lock_amount = amount
    promo_meta = promotion.metadata or {}
    promo_meta.update(
        {
            "redeemed_amount": float(amount),
            "credit_amount": float(credit_amount),
            "redeemed_at": now.isoformat(),
        }
    )
    if metadata:
        promo_meta.update(metadata)
    promotion.metadata = promo_meta
    session.add(promotion)
    return promotion


def extend_window(promotion_id: int) -> Optional[WalletPromotion]:
    """Extend the promotion window to 24 hours with a new code if still unclaimed."""

    session = SessionLocal()
    try:
        promotion: Optional[WalletPromotion] = (
            session.query(WalletPromotion)
            .filter(WalletPromotion.id == promotion_id)
            .first()
        )
        if not promotion:
            return None

        expire_outdated(session, [promotion])
        if promotion.status in {"redeemed", "expired", "cancelled"}:
            session.commit()
            return promotion

        now = datetime.utcnow()
        if promotion.extension_count >= 1:
            return promotion
        if promotion.redeemed_at:
            return promotion

        user = session.query(User).filter(User.id == promotion.user_id).first()
        if not user:
            return promotion

        promotion.code = _ensure_unique_code(session)
        promotion.expires_at = now + timedelta(hours=24)
        promotion.extension_count = (promotion.extension_count or 0) + 1
        promotion.extension_sent_at = now
        promotion.updated_at = now
        promotion.status = "active"
        promotion.status_reason = "extended_24h"
        session.add(promotion)
        session.commit()

        email_payload = _build_extension_email(promotion, user)
        _send_email(promotion, user, subject=email_payload["subject"], html_body=email_payload["html"], text_body=email_payload["text"])
        return promotion
    finally:
        session.close()


def refresh_and_list(user: User) -> List[Dict[str, object]]:
    session = SessionLocal()
    try:
        promotions = list_promotions(session, user)
        session.commit()
        return [serialize_promotion(promotion) for promotion in promotions]
    finally:
        session.close()


async def extend_window_async(promotion_id: int) -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, extend_window, promotion_id)


def send_reminder_email(promotion_id: int) -> Optional[WalletPromotion]:
    """Send the one-hour reminder email if the promotion is still active."""

    session = SessionLocal()
    try:
        promotion: Optional[WalletPromotion] = (
            session.query(WalletPromotion)
            .filter(WalletPromotion.id == promotion_id)
            .first()
        )
        if not promotion:
            return None

        expire_outdated(session, [promotion])
        if promotion.status not in {"active", "pending_checkout"}:
            session.commit()
            return promotion

        if not promotion.expires_at:
            session.commit()
            return promotion

        remaining = (promotion.expires_at - datetime.utcnow()).total_seconds()
        if remaining <= 0:
            session.commit()
            return promotion

        user = session.query(User).filter(User.id == promotion.user_id).first()
        if not user:
            session.commit()
            return promotion

        payload = _build_reminder_email(promotion, user)
        _send_email(promotion, user, subject=payload["subject"], html_body=payload["html"], text_body=payload["text"])

        promo_meta = promotion.promo_metadata or {}
        promo_meta["reminder_sent_at"] = datetime.utcnow().isoformat()
        promotion.promo_metadata = promo_meta
        promotion.updated_at = datetime.utcnow()
        session.add(promotion)
        session.commit()
        return promotion
    finally:
        session.close()
