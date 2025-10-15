# CodeX Pro — Single-Agent Instructions (Stages 1–10)

You are implementing the Fish Mouth Boost Pack step-by-step. Do **one stage per PR** and stop when acceptance checks pass.

## Stage 1 — Reporting (PRD‑01)
- Apply SQL: `boost/migrations/20251014_add_events.sql`, `boost/migrations/20251014_add_public_shares.sql`.
- Mount routers: `reports_render.py`, `events.py`, `public_shares.py`, `shortlinks.py`.
- Implement PDF & PNG rendering (renderer.py). If WeasyPrint/Playwright not installed, write deterministic HTML, but keep function signature.
- Implement `/r/{token}` viewer and emit `report.viewed` events.
- Front-end: add “Generate PDF” + “Copy Link” buttons on Report Viewer (wire only if time allows).
- Verify with Postman.

## Stage 2 — Templates/Tokens (PRD‑02)
- Create templates table and CRUD. Wire `lib/tokens.py` to previews and to messaging (later).

## Stage 3 — Messaging (PRD‑03)
- Apply SQL: `boost/migrations/20251014_add_outbox_messages.sql`.
- Implement `/api/v1/outbox/send`, dry-run providers, webhooks, and shortlinks `/l/{code}`.

## Stage 4 — Sequences v1 (PRD‑04)
- Apply SQL: `boost/migrations/20251014_add_sequences.sql`.
- Implement minimal engine in `services/sequence/engine.py` and enrollment APIs.

## Stage 5 — Intelligence v1.5 (PRD‑05)
- Extend analyzer with `image_quality`, `confidence`, overlays URL; update scoring weights and backfill.

## Stage 6 — ETL, Provenance, Consent (PRD‑06)
- Apply SQL: `boost/migrations/20251014_add_lead_compliance.sql`.
- Implement cache/backoff/provenance; enforce consent/DNC checks in send path.

## Stage 7 — Dashboard Home & App Config (PRD‑08 & PRD‑15)
- Implement `/api/v1/app-config` and `/api/v1/dashboard/summary`, `/api/v1/activity`.
- Front-end: `DashboardHome.jsx` and small components.

## Stage 8 — Scanner & Imagery (PRD‑11 & PRD‑12)
- Implement provider chain in `services/imagery/providers.py` and `ScanWizard.jsx`.

## Stage 9 — DevOps & Observability (PRD‑16)
- Add `/healthz` and `/readyz`, JSON logs, request_id middleware, and compose override.

## Stage 10 — Growth & Marketing (PRD‑13 & PRD‑14)
- Contractor outreach DB & landing; gift leads on signup.
