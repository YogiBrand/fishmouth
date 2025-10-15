# PRD‑00 · Conventions & Guardrails

- **Request IDs & Tracing:** Generate `X-Request-ID` per request; propagate to workers & WS; OpenTelemetry tracing across services.
- **Outbox & Events:** Append-only `events` table; emit business events from all services.
- **Idempotency:** `Idempotency-Key` header for POSTs that cause side effects.
- **Security:** RS256 JWT, CSP/HSTS, Fernet PII encryption, webhook signatures, consent/DNC gating.
- **Observability:** Sentry for errors, Prometheus for metrics, Grafana dashboards for golden signals.
- **Testing:** Seed script + Postman; unit/integration coverage for new libs.
