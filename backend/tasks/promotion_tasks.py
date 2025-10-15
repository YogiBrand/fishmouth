"""Celery tasks for wallet promotions."""

from __future__ import annotations

import structlog
from celery import shared_task

logger = structlog.get_logger("tasks.promotions")


@shared_task(name="tasks.promotion_tasks.extend_window")
def extend_window(promotion_id: int) -> dict:
    """Extend a promotion window and send follow-up notifications."""

    from services.promotion_service import extend_window as extend_window_service

    logger.info("wallet_promo.extend.start", promotion_id=promotion_id)
    promotion = extend_window_service(promotion_id)
    status = promotion.status if promotion else "missing"
    logger.info("wallet_promo.extend.finish", promotion_id=promotion_id, status=status)
    return {"promotion_id": promotion_id, "status": status}


@shared_task(name="tasks.promotion_tasks.send_reminder")
def send_reminder(promotion_id: int) -> dict:
    """Dispatch the one-hour reminder email."""

    from services.promotion_service import send_reminder_email

    logger.info("wallet_promo.reminder.start", promotion_id=promotion_id)
    promotion = send_reminder_email(promotion_id)
    status = promotion.status if promotion else "missing"
    logger.info("wallet_promo.reminder.finish", promotion_id=promotion_id, status=status)
    return {"promotion_id": promotion_id, "status": status}
