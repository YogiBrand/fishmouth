# FishMouth — Final Production Readiness Checklist
**Date:** 2025-10-15

Use this checklist end-to-end before first test-user rollout.

## A. Secrets & Environment
- [ ] Create `/home/yogi/fishmouth/.env` (see `.env.stack.example`) and export in your shell.
- [ ] Confirm `OPENROUTER_API_KEY`, `TWILIO_*`, `SMTP_*` (or provider keys), `MAPILLARY_TOKEN` (optional), `ORS_API_KEY` (optional).
- [ ] Set `REACT_APP_SATELLITE_TILE_TEMPLATE` (frontend) to your TiTiler URL template (see `docs/IMAGERY_SETUP.md` in repo).

## B. Databases & Migrations
- [ ] Run core backend migrations (repo's `backend/migrations`).
- [ ] Run analytics migrations: `psql $DATABASE_URL -f app/sql/migrations/001_analytics_schema.sql`.
- [ ] (Optional) Seed demo users/leads: `python3 scripts/e2e/seed_demo_data.py`.

## C. Telemetry & Observability
- [ ] Add `shared/telemetry_middleware.py` to every FastAPI app and register it.
- [ ] Ensure each service exposes `/metrics` (prometheus-fastapi-instrumentator suggested).
- [ ] Bring up Prometheus/Grafana/Loki overlay and open Grafana (3001).

## D. Imagery & Tiles
- [ ] Start tiles overlay: `docker compose -f app/docker-compose.yml -f app/config/docker-compose.tiles.yml up -d tileserver_gl titiler`.
- [ ] Verify: `http://localhost:8080/data/roofing_markets.json` and a TiTiler example from your COG.
- [ ] Set `REACT_APP_SATELLITE_TILE_TEMPLATE` and rebuild the frontend.

## E. Admin & Messaging
- [ ] Build and run **Admin UI** container (`admin-ui.Dockerfile`) or run dev server with Vite.
- [ ] In Admin → Messaging, save provider config and verify domain (SPF/DKIM/DMARC). Send a test email.
- [ ] In Admin → Queues, confirm orchestrator `/jobs` proxy returns jobs.

## F. AI & Budgets
- [ ] Ensure AI Gateway (8023) env limits are set: `AI_MAX_RPM`, `AI_MAX_TOKENS_PER_MIN`, `AI_BUDGET_USD_DAILY`.
- [ ] Run an enhanced report to confirm OpenRouter or fallback content generation.

## G. End-to-End Smoke
- [ ] Address Lookup → imagery → CV → enrichment → quality → lead created.
- [ ] Enhanced report generation → PDF export → share link.
- [ ] Outreach email/call via templates.
- [ ] Grafana shows events, API rates, and margin daily.
