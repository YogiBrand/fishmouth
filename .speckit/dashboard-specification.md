# Fish Mouth Dashboard Specification

**Version**: 4.0  
**Phase**: 2B – Gamified Monetization & AI Ops  
**Last Updated**: 2025-10-14

The dashboard is the contractor-facing mission control that fuses lead intelligence, wallet monetization, quests, and outreach tooling. This document replaces the legacy mock brief and reflects the production React implementation in `frontend/src/pages/Dashboard.jsx`.

---

## Experience Goals

1. **Single Pane of Glass** for lead discovery, outreach, and wallet management.
2. **Casino-grade Gamification** that nudges daily engagement (quests, streaks, celebrations).
3. **Monetization Transparency** through wallet balance, auto-spend toggles, and confirmation workflows.
4. **Real-time Intelligence** sourced from WebSockets (`/ws/activity`) and API endpoints.
5. **Extensibility** for upcoming outreach orchestrator (port 8007) and voice streaming metrics.

---

## Layout Overview

| Zone | Purpose | Key Components |
|------|---------|----------------|
| Sidebar | Identity + quick actions | Brand badge, streak badge, wallet shortcut, navigation |
| Header Strip | Primary CTAs | “Add Money” button, ultra-hot lead pill, notifications bell, profile dropdown |
| Mission Control Cards | KPI summary | Wallet, points, redeemed leads, quest progress, streak status |
| Quest & Gamification | Engagement loop | `DashboardQuestPanel`, celebration overlays, toast events |
| Lead Intelligence | Core workflow | `LeadIntelligenceTable`, `EnhancedLeadDetailPage`, `DashboardLeadMap`, `AreaScanner` |
| Outreach & Voice | Automation | `SequenceManager`, `VoiceCallManager`, `PointsLedgerModal`, `ReportPreviewModal` |
| Activity Tray | Real-time feed | Notification drawer fed by Redis / WebSocket activity stream |

Supporting modals (`WalletRewardsModal`, `PointsLedgerModal`, `VoiceTranscriptModal`) are reusable across dashboard and settings.

---

## Data Dependencies

| Module | Endpoint / Source | Notes |
|--------|-------------------|-------|
| Overview Stats | `GET /api/v1/dashboard/stats` | Totals, conversion funnel, cluster data |
| Hot Leads | `GET /api/v1/dashboard/hot-leads` | Filterable; feed to lead table |
| Activity Stream | `WS /ws/activity` | Wallet events, quest completions, scan updates |
| Area Scans | `leadAPI.startAreaScan`, `leadAPI.estimateScan` | REST + WebSocket progress on `/ws/scans/{scan_id}` |
| Wallet & Points | LocalStorage keys + (planned) `/api/wallet/*` endpoints | Uses keys documented in CONFIGURATION_REFERENCE |
| Quests | `fm_daily_rotation`, `fm_wallet_rotation_meta` localStorage + future `/api/rewards/quests` | Rotation seeded by quest engine service |
| Voice Calls | `voiceAPI.getCalls`, `voiceAPI.getCall`, `voiceAPI.getAnalytics` | Summaries, transcripts, analytics |
| Sequences | `leadAPI.getSequences` (mock) + `SequenceService` backend | UI scaffold ready for orchestrator feed |

---

## Feature Breakdown

### 1. Wallet & Rewards Modal
- Shared component invoked from sidebar CTA, header “Add Money” button, and settings page.
- Tabs: **Wallet** (preset chips $20/$50/$75/$100/$250 + custom amount, auto-spend toggles per channel, credit allocation) and **Rewards** (points balance, ledger preview, daily quest tasks, point conversion to credits).
- Event triggers:
  - `onInstantTopUp` → instant credit fallback (current implementation).
  - `onStripeTopUp` → planned `/api/wallet/top-up/stripe`.
  - `onToggleAutoSpend` → updates local usage rules (persisted to localStorage, future API sync).
  - `onCompleteTask` / `onRefreshDailyTasks` → quest progression.

### 2. Gamification Loop
- `DashboardQuestPanel` renders current quest wave, progress %, and CTA buttons (launch wallet, run scan, redeem lead).
- Celebration overlays triggered by quest completions or streak milestones (`setShowCelebration`, `celebrationMessage` state).
- Streak tracking uses `fm_login_streak`; weekly bonus processed client-side until backend quest service lands.

### 3. Lead Intelligence Workspace
- Table/Card toggle, advanced filtering, anomaly highlights.
- `EnhancedLeadDetailPage` consolidates imagery tiles, roof intelligence overlays, street-view snippets, AI insights, contact data, and actionable buttons (call, email, generate report, assign sequence).
- `DashboardLeadMap` and `ContagionHeatmap` visualise hotspots; map click selects lead ID.
- `AreaScanner` handles estimating spend, property caps, and launching scans with toast feedback and progress WebSocket subscription.

### 4. Outreach & Automations
- `SequenceManager` lists automation sequences and allows enrollment (backend scaffold ready for orchestrator microservice).
- `VoiceCallManager` provides history, analytics charts, transcript modal, and direct call actions. Pending enhancements once streaming metrics are live.
- `ReportPreviewModal` previews shareable homeowner reports generated via `/api/v1/reports/generate`.

### 5. Notifications & Activity
- Notification bell toggles right-hand tray with prioritized events (report_ready, ai_call_completed, wallet conversions, quest awards).
- Tray persists `lastNotificationViewedAt` timestamp to highlight new items.
- Activity feed entries originate from `activity_notifier.publish` events (scans, voice campaigns, wallet actions).

---

## State Management

- **React State**: modular `useState` per feature, heavy use of `useMemo` for derived values.
- **LocalStorage Keys**:
  - `fm_wallet_balance`, `fm_credit_buckets`, `fm_credit_usage_rules`
  - `fm_points`, `fm_point_history`, `fm_level`, `fm_login_streak`
  - `fm_completed_quests`, `fm_wallet_rotation_meta`, `fm_daily_rotation`
  - `fm_redeemed_leads`
- **Cross-Tab Sync**: Custom `fm-billing-refresh` `storage` event to refresh wallet data across open sessions.
- **WebSocket Reconnect**: Activity feed handles disconnects gracefully; consider adding exponential backoff (TODO).

---

## Technical Considerations

- **Theme Support**: Dark mode by default (`dashboardTheme` localStorage key); gradient surfaces adapt to theme.
- **Performance**: Recharts + Mapbox can be heavy; memoization and conditional rendering prevent re-renders.
- **Testing Hooks**: Toasts used for user confirmation; plan to add Cypress coverage for wallet flows once Stripe integration lands.
- **Accessibility**: Modal uses keyboard trap; ensure toast announcements include aria-live updates.

---

## Upcoming Enhancements

1. **Stripe Checkout**: Replace instant credit stub with session creation + webhook; surface pending/failed states in wallet summary card.
2. **Voice Streaming Metrics**: Add waveform visual, latency chips, and live transcript feed as streaming pipeline ships.
3. **Outreach Orchestrator**: Dedicated tab showing SMS/email campaign health, credit sliders (default 35% SMS, 35% Email, 30% Voice), and ROI charts.
4. **Quest Service API**: Move quest rotation out of localStorage into `/api/rewards/quests` for multi-device consistency.
5. **Advanced Analytics**: Cohort charts for wallet spend, quest completion funnel, and credit ROI dashboards.

---

## File Reference

- `frontend/src/pages/Dashboard.jsx` – master layout and state orchestration.
- `frontend/src/components/WalletRewardsModal.jsx`
- `frontend/src/components/DashboardQuestPanel.jsx`
- `frontend/src/components/LeadIntelligenceTable.jsx`
- `frontend/src/components/EnhancedLeadDetailPage.jsx`
- `frontend/src/components/VoiceCallManager.jsx`
- `frontend/src/components/SequenceManager.jsx`
- `frontend/src/services/api.js` – REST client wrappers & mock fallbacks.

Keep this specification synchronized with `claudeimplementation.md` whenever new modules or flows are introduced. Document any changes to localStorage schema or endpoint contracts immediately to prevent Cursor/Claude drift.

