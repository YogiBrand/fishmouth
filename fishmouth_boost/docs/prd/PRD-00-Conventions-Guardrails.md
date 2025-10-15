# PRD‑00 · Conventions & Guardrails

**Goals:** Traceable, observable, secure, and testable features. Keep the stack simple (FastAPI + React + Postgres + Redis + Celery).

**Standards**
- **Request IDs:** Generate `X-Request-ID` per request; propagate to logs/tasks/events.
- **Idempotency:** All mutating POSTs accept `Idempotency-Key` header.
- **Env management:** All integrations behind `*_ENABLED` flags and boot-time validation.
- **PII:** Encrypt at rest (phones/emails) and hash canonicalized values for dedupe.
- **Events:** Emit business events to a central `events` table (outbox pattern).
- **Observability:** Sentry + Prometheus + OpenTelemetry. JSON logs with request_id and labels.
- **Testing:** Each PRD ships with seed data + Postman scripts. Minimum unit coverage 70% for new libs.
