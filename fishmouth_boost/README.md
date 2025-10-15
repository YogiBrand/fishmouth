# Fish Mouth Boost Pack (Unified)

This pack contains **production-ready PRDs**, **ready-to-paste code stubs**, **SQL migrations**,
**frontend components**, **Postman smoke tests**, **CI**, and **ops runbooks** to implement the
recommendations discussed. It is designed to drop into your repo and be integrated **one stage at a time**.

## Folder map

- `docs/prd/` — PRDs (00–16) for Reporting, Templates/Tokens, Messaging, Sequences, Intelligence v1.5, ETL/Provenance/Consent, Ops Dashboard, Dashboard Home, Sequence Nodes, Call Log, Roof Scanner, Cost Strategy, Growth, Marketing Homepage, App Config, Server Hardening.
- `docs/ops/` — Renderer runbook, SRE runbook, Grafana dashboard JSON.
- `docs/CODEX_INSTRUCTIONS.md` — One script to paste into CodeX Pro that runs the staged implementation.
- `boost/backend/` — FastAPI-ready stubs: events client, tokens resolver, rendering worker, messaging adapters, shortlinks, sequences engine, imagery providers, and API routers.
- `boost/migrations/` — SQL DDL for events, messages, shares, templates, sequences, compliance fields, and basic billing usage.
- `boost/frontend/` — React components: DashboardHome, LeadCard, CallLogPanel, ScanWizard, Sequence node types, appConfig sample.
- `boost/postman/` — Postman collection for smoke tests.
- `boost/config/` — `.env.example` and a `docker-compose.override.prod.yml` with healthchecks and env fixes.
- `.github/workflows/ci.yml` — CI pipeline with lint/test and basic security scans.

> **Integration order:** Use `docs/CODEX_INSTRUCTIONS.md` and follow Stage 1–10.
