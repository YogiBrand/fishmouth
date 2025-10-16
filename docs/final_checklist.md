# FishMouth — Final Production Readiness Checklist
**Date:** 2025-10-15

Use this checklist end-to-end before first test-user rollout.

## A. Secrets & Environment
- [ ] Create `/home/yogi/fishmouth/.env` (see `.env.stack.example`) and export in your shell.
- [ ] Confirm keys for downstream services: `OPENROUTER_API_KEY`, `TWILIO_*`, `SMTP_*` (or provider keys), `MAPBOX_TOKEN`, `MAPILLARY_TOKEN` (optional), `ORS_API_KEY` (optional).
- [ ] Set service endpoints: `ADDRESS_LOOKUP_SERVICE_URL=http://address_lookup_8022:8022`, `BILLING_SERVICE_URL=http://billing_gw_8032:8032`, `TELEMETRY_URL=http://telemetry_gw_8030:8030`.
- [ ] Provide Stripe/MCP secrets to the billing gateway (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `BILLING_PRICE_CONFIG` or `BILLING_PRICE_CONFIG_FILE`).
- [ ] Generate and store a 32-byte `PII_ENCRYPTION_KEY` (Base64) so sensitive contact details are encrypted at rest.
- [ ] Set `REACT_APP_SATELLITE_TILE_TEMPLATE` (frontend) to your TiTiler URL template (see `docs/IMAGERY_SETUP.md` in repo) and disable mocks with `REACT_APP_ENABLE_MOCKS=false`.

## B. Databases & Migrations
- [ ] Run core backend migrations (repo's `backend/migrations`).
- [ ] Run analytics migrations: `psql $DATABASE_URL -f app/sql/migrations/001_analytics_schema.sql`.
- [ ] Refresh materialized views after deploying: `python scripts/ops/refresh_analytics.py`.
- [ ] (Optional) Seed demo users/leads: `python3 scripts/e2e/seed_demo_data.py`.

## C. Telemetry & Observability
- [ ] Confirm every FastAPI app includes `services.shared.telemetry_middleware.TelemetryMW`.
- [ ] Ensure each service exposes `/metrics` (prometheus-fastapi-instrumentator suggested).
- [ ] Bring up Prometheus/Grafana/Loki overlay and open Grafana (3001).
- [ ] Add alerts for billing webhooks, address lookup failures, and high queue latency.

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
- [ ] Address Lookup → imagery → CV → enrichment → quality → lead created (manual SmartScan end-to-end).
- [ ] Enhanced report generation → PDF export → share link.
- [ ] Wallet reload: create checkout session, complete payment, verify webhook credits wallet and analytics.
- [ ] Outreach email/call via templates.
- [ ] Grafana shows events, API rates, and margin daily.

## H. Security Hardening
- [ ] Verify `PII_ENCRYPTION_KEY` set in production and feature flags (`use_mock_*`) disabled.
- [ ] Rotate secrets via Vault/KMS; ensure `.env` files have restricted permissions.
- [ ] Confirm HTTPS/ingress termination and webhook signatures (Stripe, Telnyx) verified.
