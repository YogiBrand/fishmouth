# Admin API (8031)

FastAPI service that powers the admin UI with analytics, telemetry, messaging configuration, and queue insights. It connects to the shared analytics Postgres schema and emits telemetry to the gateway (`telemetry_gw_8030`).

## Endpoints

| Route | Description |
| --- | --- |
| `GET /health` | Basic liveness probe. |
| `GET /kpi/daily` | 30-day KPIs (leads, emails, calls, DAU) from `analytics.kpi_daily`. |
| `GET /usage/summary` | Aggregated usage totals, service mix, per-route breakdown, and history. |
| `GET /costs/summary` | Revenue, cost, and margin timeline alongside top cost drivers. |
| `GET /health/services` | Polls Postgres, Redis, and service health endpoints (backend, orchestrator, imagery, etc.). |
| `GET /users` | Searchable user ledger with credits, spend, and last activity. |
| `GET /users/{user_id}` | Detailed account view (usage timeline + transactions). |
| `POST /users/{user_id}/credits` | Increment or decrement credit balance. |
| `POST /users/{user_id}/refunds` | Stubbed refund entry (writes to `analytics.transactions`). |
| `GET /messaging/providers` / `POST /messaging/providers` | In-memory provider registry (future: persist to DB). |
| `POST /messaging/providers/test` | Emits test event + cost telemetry. |
| `POST /messaging/domain/verify` | Resolve SPF/DKIM/DMARC records. |
| `POST /cloudflare/dns/apply` | Minimal Cloudflare DNS writer (emits cost telemetry). |
| `GET /messaging/summary` | Spend + cadence for messaging tests and Cloudflare pushes. |
| `GET /queues/jobs` | Fetch orchestrator job list. |
| `GET /queues/jobs/{job_id}` | Fetch single job detail. |
| `GET /queues/overview` | Derive queue + status metrics from orchestrator payload. |

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://user:pass@postgres:5432/app` | Connection string to analytics Postgres. |
| `ANALYTICS_URL` | Same as above | Optional alias consumed alongside `DATABASE_URL`. |
| `TELEMETRY_URL` | `http://telemetry_gw_8030:8030` | Endpoint for emitting usage/cost events. |
| `REDIS_HOST` / `REDIS_PORT` | `redis` / `6379` | Used for Redis health check. |
| `ORCH_URL` | `http://orchestrator:8009` | Location of orchestrator job endpoints (override in non-docker environments). |
| `ADMIN_SERVICE_ID` | `8031` | Service identifier stored with telemetry events. |

## Local Development

```bash
# inside app/services/admin-api-8031
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8031
```

Ensure Postgres has the analytics schema and materialised views (`app/sql/migrations/001_analytics_schema.sql`). When running via `app/docker-compose.yml`, Postgres, Redis, telemetry, admin API, and billing gateway start together.

Telemetry emissions are fire-and-forget; failures are swallowed so the admin UI remains responsive even if the telemetry gateway is offline.
