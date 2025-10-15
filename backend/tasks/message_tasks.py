"""Celery tasks for the messaging outbox."""

from __future__ import annotations

import structlog
from celery import shared_task

from services.outbox_service import deliver_outbox_message

logger = structlog.get_logger("tasks.messaging")


@shared_task(name="tasks.message_tasks.deliver")
def deliver(message_id: str) -> dict:
    """Deliver a queued outbox message."""

    logger.info("messaging.deliver.start", message_id=message_id)
    result = deliver_outbox_message(message_id)
    logger.info("messaging.deliver.finish", message_id=message_id, status=result.get("status"))
    return result
