"""Celery tasks for the growth module."""

from __future__ import annotations

import structlog
from celery import shared_task

from services.growth import (
    refresh_contractor_prospects,
    run_outreach_batch,
    summarize_prospect_pipeline,
)

logger = structlog.get_logger("tasks.growth")


@shared_task(name="tasks.growth.refresh")
def refresh() -> dict:
    """Refresh contractor prospects from polite sources."""

    result = refresh_contractor_prospects()
    logger.info("growth.prospects.refreshed", **result)
    return result


@shared_task(name="tasks.growth.outreach")
def outreach(batch_size: int = 25, channel: str = "email") -> dict:
    """Dispatch outreach messages to high scoring prospects."""

    result = run_outreach_batch(batch_size=batch_size, channel=channel)
    pipeline = summarize_prospect_pipeline()
    logger.info("growth.outreach.completed", result=result, pipeline=pipeline)
    return {**result, "pipeline": pipeline}
