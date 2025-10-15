"""Celery application factory."""

from celery import Celery

from config import get_settings


def make_celery() -> Celery:
    settings = get_settings()
    celery_app = Celery(
        "fishmouth",
        broker=settings.celery.broker_url,
        backend=settings.celery.result_backend,
        include=[
            "tasks.scan_tasks",
            "tasks.scan_job_tasks",
            "tasks.sequence_tasks",
            "tasks.analytics_tasks",
            "tasks.message_tasks",
            "tasks.growth_tasks",
            "tasks.promotion_tasks",
            "celery_tasks.tasks.scanning",
            "celery_tasks.tasks.imagery_fetch",
            "celery_tasks.tasks.cleanup_assets",
        ],
    )

    celery_app.conf.update(
        task_default_queue=settings.celery.task_default_queue,
        worker_concurrency=settings.celery.worker_concurrency,
        task_track_started=True,
        task_time_limit=600,
    )

    if settings.celery.beat_enabled:
        celery_app.conf.beat_schedule = {
            "process-sequence-steps": {
                "task": "tasks.sequence_tasks.dispatch_pending_sequences",
                "schedule": 60.0,
            },
            "refresh-analytics": {
                "task": "tasks.analytics_tasks.refresh_rollups",
                "schedule": 300.0,
            },
        }

    return celery_app


celery_app = make_celery()
