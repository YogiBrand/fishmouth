# PRD‑07 · Ops Dashboard & Billing Usage

**Goal**: Surface real activity, funnel, usage/credits, and health on the dashboard.

**API**
- `GET /api/v1/dashboard/summary` → KPIs, funnel, usage, errors_24h
- `GET /api/v1/activity` → recent events

**Data**
- `billing_usage`, `wallet_credits`

**Acceptance**
- Activity reflects `events` rows; funnel matches `message_events` and `report.*` events.
