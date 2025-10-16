# Codex — FINAL Single-Agent Prompt (Production Wiring)

**Workdir:** /home/yogi/fishmouth
**Goal:** Fully wire FishMouth for local production-like run with tiles, admin, telemetry, AI gateway budgets, and e2e smoke tests.

0) Preflight
- Ensure docker + compose installed; `docker compose version`.
- Create `/home/yogi/fishmouth/.env` from `.env.stack.example` in `fishmouth_final_gap_pack_v4` and fill secrets.
- Confirm OpenRouter key present or expect template fallbacks.

1) Sync gap pack
- Copy `/mnt/data/fishmouth_final_gap_pack_v4/*` into `/home/yogi/fishmouth/` preserving folders.
- Ensure paths now exist:
  - `/home/yogi/fishmouth/app/services/shared/telemetry_middleware.py`
  - `/home/yogi/fishmouth/app/services/orchestrator-8001/routes/jobs.py`
  - `/home/yogi/fishmouth/app/services/admin-api-8031/app/routes_messaging_provider_send.py`
  - `/home/yogi/fishmouth/app/admin-ui/Dockerfile`, `/home/yogi/fishmouth/app/admin-ui/serve/nginx.conf`
  - `/home/yogi/fishmouth/config/nginx/reverse-proxy.conf`
  - `/home/yogi/fishmouth/Makefile`

2) Wire telemetry middleware
- For each FastAPI service under `/home/yogi/fishmouth/app/services/*/app/main.py`:
  - Import: `from services.shared.telemetry_middleware import TelemetryMW`
  - Register: `app.add_middleware(TelemetryMW)` and set `SERVICE_NAME` env in the service's compose.
- Rebuild those images.

3) Orchestrator jobs routes
- In `/home/yogi/fishmouth/app/services/orchestrator-8001/app/main.py`:
  - `from routes.jobs import router as jobs_router`
  - `app.include_router(jobs_router)`

4) Admin API SMTP send
- In `/home/yogi/fishmouth/app/services/admin-api-8031/app/main.py`:
  - `from routes_messaging_provider_send import router as send_router`
  - `app.include_router(send_router)`
- Ensure env vars `SMTP_*`, `FROM_*` set in `.env`.

5) Databases
- Apply analytics migration:
  - `psql $DATABASE_URL -f /home/yogi/fishmouth/app/sql/migrations/001_analytics_schema.sql`
- Seed demo:
  - `python3 /home/yogi/fishmouth/scripts/e2e/seed_demo_data.py`

6) Build & run stacks
- Core + modular:
  - `make up`
- Tiles (optional but recommended):
  - `make tiles`

7) Admin UI (production build)
- `make admin-ui` (builds Vite -> nginx image and runs on :3031).

8) Frontend map env
- Copy `/home/yogi/fishmouth/app/frontend/.env.development.example` to `.env.development` and set `REACT_APP_SATELLITE_TILE_TEMPLATE` to your TiTiler template.
- Rebuild frontend if necessary (`npm run dev` in the repo’s frontend, or rely on your existing compose).

9) Observability
- Bring up overlay (if separate in your repo): `docker compose -f app/docker-compose.yml -f app/observability/docker-compose.observability.yml up -d`
- Open Grafana at http://localhost:3001

10) E2E smoke
- `make e2e` and fix any failing step. Expect OK.

Deliverables:
- Push all changes to origin/main.
- Paste `make e2e` output into PR description.
