"""Celery entrypoint to execute scanner jobs via ScanJobService."""

from __future__ import annotations

import asyncio

from celery import shared_task

from services.scan_job_service import ScanJobService


@shared_task(bind=True, name="scanner.run")
def run_scan(self, scan_id: str):
    """Execute a scan job using the existing asynchronous runner."""

    try:
        self.update_state(state="PROGRESS", meta={"scan_id": scan_id})
    except Exception:  # pragma: no cover - state updates are best-effort
        pass

    asyncio.run(ScanJobService.run_job_async(scan_id))
    return {"scan_id": scan_id, "status": "completed"}
