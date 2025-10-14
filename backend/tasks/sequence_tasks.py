"""Celery orchestration for sequence execution."""

import asyncio

import structlog
from celery import shared_task

from database import SessionLocal
from models import SequenceEnrollment
from services.sequence_service import SequenceExecutor

logger = structlog.get_logger("tasks.sequence")


@shared_task
def dispatch_pending_sequences() -> None:
    """Process all sequence enrollments that are ready to execute."""

    db = SessionLocal()
    try:
        logger.debug("sequence.dispatch.start")
        asyncio.run(SequenceExecutor.process_pending_steps(db))
        logger.debug("sequence.dispatch.finished")
    finally:
        db.close()


@shared_task
def execute_enrollment(enrollment_id: int) -> None:
    """Execute a specific enrollment node."""

    db = SessionLocal()
    try:
        enrollment = (
            db.query(SequenceEnrollment)
            .filter(SequenceEnrollment.id == enrollment_id)
            .first()
        )
        if not enrollment or enrollment.status != "active":
            return

        logger.debug("sequence.enrollment.start", enrollment_id=enrollment_id)

        async def _run():
            await SequenceExecutor.execute_next_step(enrollment, db)
            await SequenceExecutor.process_pending_steps(db)

        asyncio.run(_run())
        logger.debug("sequence.enrollment.finished", enrollment_id=enrollment_id)
    finally:
        db.close()
