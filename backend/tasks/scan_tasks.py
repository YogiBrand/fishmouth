"""Celery tasks for the lead scanning pipeline."""

import asyncio

import structlog
from celery import shared_task

from services.lead_generation_service import LeadGenerationService

logger = structlog.get_logger("tasks.scan")


@shared_task(bind=True)
def process_area_scan(self, scan_id: int) -> None:
    """Execute the async scan flow in a worker context."""

    try:
        self.update_state(state="PROGRESS", meta={"scan_id": scan_id})
        asyncio.run(LeadGenerationService._run_scan(scan_id))
        logger.info("scan.completed", scan_id=scan_id)
    except Exception:  # pragma: no cover
        logger.exception("scan.failed", scan_id=scan_id)
        raise
