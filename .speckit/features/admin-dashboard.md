# Admin Dashboard Feature Spec

**Version**: 4.0  
**Status**: ✅ Production Ready (wallet telemetry + gamification included)  
**Last Updated**: 2025-10-14

The admin dashboard is the operator cockpit for Finance, Support, and Growth teams. It surfaces real-time usage, monetization telemetry, system health, and actionable queues (manual confirmations, webhook alerts) in one view.

---

## Access & Routing

- **URL**: `/admin`
- **Auth**: `/admin/login` (email + password)  
  Requires JWT with `role ∈ {admin, superadmin}`; enforced via `get_current_admin` dependency.
- **Source File**: `frontend/src/pages/AdminDashboard.jsx`
- **API Surface**:
  - `GET /api/v1/dashboard/stats` – overview metrics
  - `GET /api/v1/dashboard/activity` – recent activity feed
  - `GET /api/v1/dashboard/hot-leads` – high-scoring leads (context for outreach decisions)
  - `GET /api/admin/wallet/summary` *(planned)* – wallet & confirmation telemetry
  - `GET /api/admin/billing/usage` – usage ledger rollup
  - `GET /api/admin/billing/export` – CSV exports (per period)

---

## Layout & Components

| Section | Component | Purpose |
|---------|-----------|---------|
| Hero Strip | Stat cards (Wallet in circulation, MRR, Active users, System health) | Snapshot of platform economics & uptime |
| Revenue Analytics | Line/area charts (Recharts) | Trend tracking for subscriptions vs consumption, margin heatmap |
| Wallet & Rewards Telemetry | Admin tiles + queue table | Monitor wallet balances, point issuance, manual confirmation backlog, Stripe webhook freshness |
| User Metering | Aggregated tables | Leads generated, voice minutes, SMS/email usage, auto-spend status per contractor |
| Manual Confirmation Queue | Modal/table (planned API) | Review pending debit approvals when customers disable auto-spend |
| Stripe Status Panel | Inline card | Shows mode (test/live), last webhook id, error badges |
| System Health | Health cards + alert list | Database/Redis latency, Celery backlog, third-party availability |
| Activity Feed | Timeline feed | Most recent high-impact events (wallet top-up, quest completed, scan launched, voice campaign) |

React hooks memoise data to avoid expensive recalculations; skeleton loaders cover initial fetch states.

---

## Data Model Touchpoints

- `BillingUsage` – hourly consumption per channel; aggregated for revenue charts.
- `WalletBalance`, `CreditLedger`, `PointHistory` – monetization telemetry; totals surfaced in cards.
- `ManualConfirmation` *(planned)* – queued transactions awaiting admin decision.
- `StripeWebhookLog` *(planned)* – cache of last processed webhook events.
- `Lead`, `VoiceCall`, `AreaScan` – activity feed context.

`DashboardService.fetch_overview` and related queries power most metrics. Extend this service when new admin visualisations are required.

---

## Monetization Insights

1. **Wallet Circulation Card**
   - `total_cash_in_wallets`
   - `credits_outstanding` (per channel)
   - `points_issued` vs `points_redeemed`
2. **Auto-Spend Heatmap**
   - % of contractors with auto-spend enabled per channel (scans, voice, sms, email)
   - Drill-down table links to contractor detail view.
3. **Manual Confirmation Queue**
   - Pending approvals sorted by age.
   - Displays request amount, channel, customer, reason (auto-spend disabled, threshold exceeded, flagged risk).
   - Approval actions (Approve, Reject, Snooze) – UI ready; API wiring pending.
4. **Stripe Health Tile**
   - Live vs test mode chip.
   - Last `checkout.session.completed` timestamp.
   - Warning when webhook lag > 5 minutes or retries > 0 in last hour.

---

## Roadmap Hooks (Tracked in CURRENT_STATUS.md)

| Feature | Status | Notes |
|---------|--------|-------|
| Stripe checkout session builder | 🔄 | Endpoint + webhook reconciliation feeding admin telemetry |
| Wallet manual confirmation API | 🔄 | Connect UI queue to backend actions & notifications |
| Outreach orchestrator analytics | 🟡 | Will add SMS/email spend panels once service (port 8007) matures |
| Kubernetes dashboards | 🟡 | Prometheus/Grafana cards to replace manual health checks |

---

## Security & Auditing

- All admin interactions recorded via `record_audit_event` with entity metadata.
- Sensitive exports gated by role check and optional time-based access windows.
- Manual approvals log user/id, action, old/new status, and justification.
- Admin session logs feed into `AuditLog` for traceability.

---

## Implementation Checklist

1. **API Accuracy** – Keep `DashboardService` queries in sync with schema changes (especially wallet tables).
2. **Telemetry Reliability** – Ensure Celery tasks aggregating daily usage and wallet metrics run nightly.
3. **UI Sync** – Update `AdminDashboard.jsx` when adding new cards (consistent gradient surface & icon usage).
4. **Docs Alignment** – When wallet/quest logic changes, update this file, `CONFIGURATION_REFERENCE.md`, and `CURRENT_STATUS.md`.

---

## Related Files

- `frontend/src/pages/AdminDashboard.jsx`
- `backend/app/api/v1/dashboard.py`
- `backend/app/services/dashboard_service.py`
- `backend/services/billing_service.py`
- `backend/services/billing_stripe.py`
- `backend/app/services/activity_stream.py`

This document is the single source of truth for admin/operator functionality. Sync with `claudeimplementation.md` for any future services (e.g., Outreach Orchestrator dashboards).




