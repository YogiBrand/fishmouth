"""Shared observability helpers for microservices."""

from __future__ import annotations

import logging
import os
import sys
import time
import uuid
from typing import Optional

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


def _as_bool(value: Optional[str], default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def configure_logging(service_name: str) -> None:
    """Initialise structured logging for a service."""

    log_level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    log_level = getattr(logging, log_level_name, logging.INFO)
    use_json = _as_bool(os.getenv("LOG_JSON", "true"), default=True)

    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
    ]

    if use_json:
        render_processor = structlog.processors.JSONRenderer()
    else:
        render_processor = structlog.dev.ConsoleRenderer()

    structlog.configure(
        processors=shared_processors + [render_processor],
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        cache_logger_on_first_use=True,
    )

    logging.basicConfig(level=log_level, format="%(message)s", stream=sys.stdout)

    structlog.contextvars.bind_contextvars(service=service_name)


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Middleware that binds a request id to the logging context."""

    def __init__(self, app, service_name: str) -> None:  # type: ignore[override]
        super().__init__(app)
        self._service_name = service_name
        self._header_name = os.getenv("X_REQUEST_ID_HEADER", "X-Request-ID")

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        request_id = request.headers.get(self._header_name) or str(uuid.uuid4())
        request.state.request_id = request_id

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            service=self._service_name,
            path=request.url.path,
            method=request.method,
        )

        start_time = time.time()
        logger = structlog.get_logger(self._service_name)
        logger.bind(route=request.url.path).info("request.start")

        try:
            response = await call_next(request)
        except Exception as exc:  # pragma: no cover - defensive
            logger.error("request.error", error=str(exc))
            raise
        finally:
            duration = time.time() - start_time
            logger.info("request.stop", duration_ms=round(duration * 1000, 3))
            structlog.contextvars.clear_contextvars()

        response.headers[self._header_name] = request_id
        response.headers.setdefault("X-Service-Name", self._service_name)
        response.headers.setdefault("X-Process-Time", f"{duration:.6f}")
        return response


def init_tracing(service_name: str) -> None:
    """Initialise OTLP tracing if the SDK is available and configured."""

    endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
    if not endpoint:
        return

    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor
    except ImportError:  # pragma: no cover - optional dependency
        logging.getLogger(service_name).warning(
            "otel.unavailable",
            extra={"endpoint": endpoint, "hint": "install opentelemetry-sdk"},
        )
        return

    resource = Resource.create(
        {
            "service.name": service_name,
            "service.version": os.getenv("SERVICE_VERSION", "unknown"),
            "deployment.environment": os.getenv("ENVIRONMENT", "development"),
        }
    )

    provider = TracerProvider(resource=resource)
    processor = BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint))
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)


def setup_observability(service_name: str) -> None:
    """Configure logging and tracing for a service."""

    configure_logging(service_name)
    init_tracing(service_name)
