# CodeX Pro – Integration Script

Objectives: 1) Server-rendered PDFs + share links, 2) Token/templates, 3) Messaging + receipts + shortlinks,
4) Events + outbox, 5) Sequences v1, 6) Overlays/quality/confidence + scoring refresh, 7) Dashboard Home + App Config,
8) Scanner Wizard + imagery policy, 9) DevOps hardening, 10) Growth + Homepage.

Steps:
- Copy `/boost/backend/**` into backend; mount new routers; wire Celery queues (`rendering`, `messaging`, `etl`, `scoring`).
- Apply SQL drafts in `/boost/migrations/`.
- Add `/api/v1/app-config` returning `/boost/frontend/src/config/appConfig.json` (cached).
- Add frontend pages/stubs under `/boost/frontend/src` and wire routes.
- Replace TODOs with provider calls (SendGrid/Telnyx/Mapbox/Google).
- Run Postman collection `/boost/postman/fishmouth_boost.postman.json`.
