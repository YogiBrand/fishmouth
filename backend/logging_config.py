"""Structured logging configuration using structlog."""

import logging
import sys
from typing import Optional

import structlog

from config import get_settings


def configure_logging() -> None:
    """Configure application logging only once."""

    settings = get_settings()

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
    ]

    structlog.configure(
        processors=shared_processors
        + [
            structlog.dev.ConsoleRenderer() if settings.environment == "development" else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, settings.instrumentation.log_level.upper(), logging.INFO)),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(
        level=getattr(logging, settings.instrumentation.log_level.upper(), logging.INFO),
        format="%(message)s",
        stream=sys.stdout,
    )


def bind_request_context(request_id: Optional[str] = None) -> None:
    """Bind contextual information for a request lifecycle."""

    if request_id:
        structlog.contextvars.bind_contextvars(request_id=request_id)


def clear_request_context() -> None:
    """Clear bound context variables."""

    structlog.contextvars.clear_contextvars()
