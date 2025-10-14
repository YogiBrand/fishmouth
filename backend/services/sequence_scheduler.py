"""Scheduling helpers for the autonomous sequence engine."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Dict, Optional

from config import get_settings
from database import SessionLocal
from models import SequenceEnrollment

_inline_handles: Dict[int, asyncio.TimerHandle] = {}


async def _process_enrollment_async(enrollment_id: int) -> None:
    """Execute a specific enrollment using the shared SequenceExecutor."""
    from services.sequence_service import SequenceExecutor  # Local import to avoid circular reference

    db = SessionLocal()
    try:
        enrollment = (
            db.query(SequenceEnrollment)
            .filter(SequenceEnrollment.id == enrollment_id)
            .first()
        )
        if enrollment and enrollment.status == "active":
            await SequenceExecutor.execute_next_step(enrollment, db)
        await SequenceExecutor.process_pending_steps(db)
    finally:
        db.close()


async def _process_all_async() -> None:
    from services.sequence_service import SequenceExecutor

    db = SessionLocal()
    try:
        await SequenceExecutor.process_pending_steps(db)
    finally:
        db.close()


def _run_inline_now(enrollment_id: Optional[int] = None) -> None:
    """Execute enrollment (or full scan) immediately in inline mode."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        if enrollment_id is None:
            asyncio.run(_process_all_async())
        else:
            asyncio.run(_process_enrollment_async(enrollment_id))
    else:
        if enrollment_id is None:
            loop.create_task(_process_all_async())
        else:
            loop.create_task(_process_enrollment_async(enrollment_id))


def _schedule_inline_later(enrollment_id: int, eta: datetime) -> None:
    """Schedule enrollment execution in inline/mock mode without blocking."""
    now = datetime.utcnow()
    delay = max(0.0, (eta - now).total_seconds())

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        # No running loop; execute synchronously after delay using blocking sleep
        import time

        time.sleep(delay)
        asyncio.run(_process_enrollment_async(enrollment_id))
        return

    def _callback() -> None:
        handle = _inline_handles.pop(enrollment_id, None)
        if handle:
            handle.cancel()
        loop.create_task(_process_enrollment_async(enrollment_id))

    handle = loop.call_later(delay, _callback)
    previous = _inline_handles.get(enrollment_id)
    if previous:
        previous.cancel()
    _inline_handles[enrollment_id] = handle


def schedule_enrollment_execution(enrollment_id: int, eta: Optional[datetime]) -> None:
    """Schedule an enrollment execution either inline or through Celery."""
    settings = get_settings()
    eta = eta or datetime.utcnow()

    if settings.feature_flags.use_inline_sequence_runner:
        if eta <= datetime.utcnow():
            _run_inline_now(enrollment_id)
        else:
            _schedule_inline_later(enrollment_id, eta)
        return

    try:
        from celery_app import celery_app
    except ImportError:
        # Celery is not available; fallback to inline execution
        _run_inline_now(enrollment_id)
        return

    celery_eta = None
    if eta > datetime.utcnow():
        celery_eta = eta

    celery_app.send_task(
        "tasks.sequence_tasks.execute_enrollment",
        args=[enrollment_id],
        eta=celery_eta,
    )


def trigger_pending_scan() -> None:
    """Kick the background job that scans for ready enrollments."""
    settings = get_settings()
    if settings.feature_flags.use_inline_sequence_runner:
        _run_inline_now(enrollment_id=None)
        return

    try:
        from celery_app import celery_app
    except ImportError:
        _run_inline_now(enrollment_id=None)
        return

    celery_app.send_task("tasks.sequence_tasks.dispatch_pending_sequences")
