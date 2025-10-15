# PRD‑16 · Server Hardening

- Health endpoints `/healthz`, `/readyz` for every service.
- JSON logs with `request_id`; OpenTelemetry exporters.
- Docker compose override fixes & resource limits.
- CI gates for migrations and tests; Sentry release tagging.
