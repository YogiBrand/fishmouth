"""Celery task base classes and helpers."""

from celery import Task

from config import get_settings


class DBTask(Task):
    """Base task that provides access to application settings."""

    abstract = True

    def __init__(self):
        super().__init__()
        self.settings = get_settings()
