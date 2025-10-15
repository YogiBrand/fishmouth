"""Celery task to process scan jobs."""

import asyncio

import structlog
from celery import shared_task

from services.scan_job_service import ScanJobService

logger = structlog.get_logger("tasks.scan_jobs")


@shared_task(bind=True)
def process_scan_job(self, job_id: str) -> None:
    """Execute scan job asynchronously inside worker."""

    try:
        self.update_state(state="PROGRESS", meta={"job_id": job_id})
        asyncio.run(ScanJobService.run_job_async(job_id))
        logger.info("scan_job.completed", job_id=job_id)
    except Exception:  # pragma: no cover
        logger.exception("scan_job.failed", job_id=job_id)
        raise

