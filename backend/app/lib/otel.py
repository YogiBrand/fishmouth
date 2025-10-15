"""OpenTelemetry helper shim."""

from __future__ import annotations

import os

try:
    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
except Exception:  # pragma: no cover - optional dependency
    trace = None


def setup_otel(service_name: str = "fishmouth-backend") -> None:
    """Configure a basic OTLP exporter if opentelemetry is installed."""

    if trace is None:
        return
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT")
    headers = os.environ.get("OTEL_EXPORTER_OTLP_HEADERS")

    resource = Resource.create({"service.name": service_name})
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint=endpoint, headers=headers) if endpoint or headers else OTLPSpanExporter()
    processor = BatchSpanProcessor(exporter)
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
