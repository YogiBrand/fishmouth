"""Analytics refresh tasks."""

import structlog
from celery import shared_task

logger = structlog.get_logger("tasks.analytics")


@shared_task
def refresh_rollups() -> None:
    """Placeholder for future materialised view refreshes."""

    logger.debug("analytics.refresh.skipped", reason="not_implemented")
