# Observability Runbook

This guide documents how to enable full telemetry for the Fish Mouth platform once the
containers are deployed.

## 1. Prometheus & Grafana setup

1. Ensure the Prometheus server is scraping the backend at `http://backend:8000/metrics`
   (enabled automatically when `ENABLE_PROMETHEUS=true`).
2. Import the bundled Grafana dashboard:
   - Navigate to **Dashboards → Import** in Grafana.
   - Upload `docs/ops/grafana-backend-dashboard.json` or paste its JSON.
   - Select the Prometheus data source you use for the stack.
3. The dashboard exposes p95 latency, throughput, and error rates for the FastAPI backend.
   Duplicate the dashboard and adjust the `service` label to visualise scraper, enrichment,
   or other microservices once their Prometheus exporters are enabled.

## 2. OpenTelemetry exporter

All services accept an `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable.
Set it to your collector endpoint, e.g.

```bash
otel-collector:4318
```

The Python services will automatically initialise OTLP tracing (if the
`opentelemetry-sdk` package is present) and tag traces with `service.name` and
`service.version` attributes.

## 3. Sentry configuration

Set the following environment variables for Sentry release tracking:

- `SENTRY_DSN` – project DSN.
- `SENTRY_RELEASE` – semantic version or commit hash (defaults to `dev`).
- `SERVICE_VERSION` – propagated to OTEL traces and log context.

Deployments should export these variables for both the backend and the
microservices so release tagging is consistent across the stack.

## 4. Request correlation

Every FastAPI service now emits JSON logs that include the `request_id` field.
If an inbound request provides the header defined by `X_REQUEST_ID_HEADER`
(default `X-Request-ID`), it will be propagated downstream and also returned in
responses. The same request id is attached to structured logs, Sentry events,
and OTLP spans for easy cross-tool correlation.

## 5. Health & readiness endpoints

All services answer on:

- `/healthz` – light liveness probe.
- `/readyz` – full readiness check used by Docker health checks and Kubernetes probes.

These endpoints can be polled by external monitors or uptime tools. The
compose file already wires service healthchecks against `/readyz`.

## 6. CI pipeline

GitHub Actions workflow `devops-hardening.yml` runs on each push/pull request:

1. Installs backend dependencies and executes the sequence engine regression test.
2. Builds the backend Docker image to ensure the Dockerfile stays valid.
3. Runs a Trivy scan against the temporary image to surface critical CVEs.
4. Archives key build context files for downstream promotion jobs.

Extend this workflow with additional steps (frontend build, Helm chart
validation, etc.) as the deployment matures.
