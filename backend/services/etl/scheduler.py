"""Orchestration helpers for ETL job tracking."""

from __future__ import annotations

import uuid
from contextlib import AbstractContextManager
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from models import ETLError, ETLJob


@dataclass
class JobMetrics:
    records_processed: int = 0
    success_count: int = 0
    skip_count: int = 0
    error_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)


class ETLJobLogger(AbstractContextManager["ETLJobLogger"]):
    """Context manager that records ETL job lifecycle events."""

    def __init__(self, session: Session, job_type: str, target: Optional[str] = None, attempt: int = 1) -> None:
        self.session = session
        self.job_type = job_type
        self.target = target
        self.attempt = attempt
        self.metrics = JobMetrics()
        self.job: Optional[ETLJob] = None
        self._completed = False

    def __enter__(self) -> "ETLJobLogger":
        self.job = ETLJob(
            id=str(uuid.uuid4()),
            job_type=self.job_type,
            target=self.target,
            status="running",
            attempt=self.attempt,
            started_at=datetime.utcnow(),
        )
        self.session.add(self.job)
        self.session.flush()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if not self.job:
            return None
        if exc:
            self.fail(str(exc))
        elif not self._completed:
            self.fail("Job exited without completion flag")
        return None

    def log_error(self, step: str, message: str, retryable: bool = True) -> None:
        if not self.job:
            return
        error = ETLError(
            job_id=self.job.id,
            step=step,
            message=message[:2000],
            retryable=retryable,
        )
        self.session.add(error)
        self.metrics.error_count += 1
        self.session.flush()

    def complete(self, *, metrics: Optional[JobMetrics] = None) -> None:
        if not self.job:
            return
        if metrics:
            self.metrics = metrics
        self.job.status = "completed"
        self.job.finished_at = datetime.utcnow()
        self.job.records_processed = self.metrics.records_processed
        self.job.success_count = self.metrics.success_count
        self.job.skip_count = self.metrics.skip_count
        self.job.error_count = self.metrics.error_count
        self.job.job_metadata = self.metrics.metadata
        self.session.flush()
        self._completed = True

    def fail(self, message: str) -> None:
        if not self.job:
            return
        self.job.status = "failed"
        self.job.finished_at = datetime.utcnow()
        self.job.error_count = max(self.job.error_count, 1)
        self.job.job_metadata = (self.job.job_metadata or {}) | {"failure": message}
        self.session.flush()
        self._completed = True


class ETLScheduler:
    """Minimal scheduler placeholder that coordinates ETL jobs."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def start_job(self, job_type: str, target: Optional[str] = None, attempt: int = 1) -> ETLJobLogger:
        return ETLJobLogger(self.session, job_type=job_type, target=target, attempt=attempt)

