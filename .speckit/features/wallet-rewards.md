# Wallet, Rewards & Gamification

**Version**: 4.0  
**Status**: ✅ Wallet + quests live · 🟡 Stripe checkout + auto-distribution enhancements pending  
**Last Updated**: 2025-10-14

---

## Goals

1. Provide instant funding + conversion between cash and feature credits (scans, voice, SMS, email).
2. Incentivise daily platform usage via quests, streaks, and point economies.
3. Give admins transparency into monetization performance and manual confirmation queues.

---

## Key Components

| Area | File(s) | Description |
|------|---------|-------------|
| Modal UI | `frontend/src/components/WalletRewardsModal.jsx` | Tabbed modal (Wallet / Rewards) with preset chips, custom amounts, auto-spend toggles, quest list, point conversions, ledger preview |
| Points Ledger | `frontend/src/components/PointsLedgerModal.jsx` | Detailed ledger with filters (awards, spends, quests, transfers) |
| Dashboard Integrations | `frontend/src/pages/Dashboard.jsx`, `DashboardQuestPanel.jsx` | Sidebar badge, header CTA, quest progress, celebration overlays |
| Settings Integration | `frontend/src/components/ComprehensiveBusinessSettings.jsx` | Rewards tab summarises wallet state and opens modal |
| Admin Telemetry | `frontend/src/pages/AdminDashboard.jsx` | Wallet balances, manual confirmation queue, Stripe status tile |
| Backend Ledger | `BillingUsage`, `WalletBalance`, `CreditLedger`, `PointHistory` | Primary tables storing balances and transactions |
| Activity Stream | `app/services/activity_stream.py` | Publishes wallet/quest events to `/ws/activity` |

---

## User Flows

### 1. Add Money
```
User clicks "Add Money" / "Add Funds" CTA
  → Wallet tab opens with preset chips ($20/$50/$75/$100/$250) + custom input
  → Choose instant credit (current fallback) or Stripe checkout (pending)
  → Balance updates immediately; toast confirmation; activity event emitted
```

### 2. Auto-Spend Routing
- Toggles per channel (SmartScans, Voice minutes, SMS, Email).
- When enabled: wallet balance auto-converts at 4× API cost (configurable).
- When disabled: transactions placed into manual confirmation queue (modal + admin view).

### 3. Quest Completion
- Daily rotation waves seeded client-side (Redis-backed service planned).
- Completing quests awards points, triggers celebration overlay, updates ledger.
- `fm_completed_quests` localStorage tracks completion; streak increments via `fm_login_streak`.

### 4. Convert Points to Credits
- Rewards tab allows converting points into channel credits (uses `onExchangePoints` callback).
- Redeem 100 points for 1 lead credit (configurable in CONFIGURATION_REFERENCE).

---

## Storage & Sync

| Key | Purpose |
|-----|---------|
| `fm_wallet_balance` | Cached cash balance (number) |
| `fm_credit_buckets` | `{ scans, voice, sms, email }` counts |
| `fm_credit_usage_rules` | Auto-spend toggles (`true`/`false`) |
| `fm_points`, `fm_point_history` | Point balance & ledger entries |
| `fm_wallet_rotation_meta` | Quest wave metadata (`date`, `wave`) |
| `fm_daily_rotation` | Current quest tasks array |
| `fm_completed_quests` | Completion map for tasks |
| `fm-billing-refresh` | `storage` event channel for cross-tab sync |

Backend persistence (coming with Stripe/webhook work) will reconcile local cache with server truth.

---

## Configuration (ENV)

See `.speckit/implementation/CONFIGURATION_REFERENCE.md` for full list. Key values:

```
WALLET_CONVERSION_MULTIPLIER=4.0
QUEST_DAILY_POINTS=50
QUEST_WAVE_COOLDOWN_MINUTES=15
AUTO_SPEND_DEFAULT_SMS_PERCENT=35
AUTO_SPEND_DEFAULT_EMAIL_PERCENT=35
AUTO_SPEND_DEFAULT_VOICE_PERCENT=30
STRIPE_CHECKOUT_SUCCESS_URL=https://app.fishmouth.ai/wallet/success
STRIPE_CHECKOUT_CANCEL_URL=https://app.fishmouth.ai/wallet/cancel
```

---

## Admin Responsibilities

- Monitor manual confirmation queue; approve/deny within SLA (< 2 hours).
- Review Stripe webhook status to ensure payments reconcile with ledger.
- Track `points issued` vs `points redeemed` to adjust quest economics.
- Adjust auto-distribution defaults (SMS/Email/Voice) as outreach orchestrator evolves.

---

## Roadmap Tasks

1. **Stripe Checkout & Webhooks** – Replace instant credit fallback, sync ledger + quest bonuses on `checkout.session.completed`.
2. **Server-side Quest Engine** – Move rotation to backend service to support multi-device & mobile.
3. **Auto-Distribution Sliders** – Let users budget wallet funds across channels (35/35/30 defaults) with forecasting.
4. **Reward Store** – Redeem points for premium assets (reports, voice minutes, marketing kits).
5. **Fraud Detection** – Alerts when ledger imbalances or suspicious top-up patterns detected.

---

## Testing Guidelines

- Run snapshot tests for `WalletRewardsModal` states (wallet tab vs rewards tab, auto-spend disabled states).
- Verify localStorage keys persist correctly between sessions.
- Integration tests (once Stripe is live) should cover checkout success/cancel and webhook retries.
- Manual QA: confirm quest completion increments streaks, ledger entries appear, and admin telemetry updates after actions.

Keep this document aligned with `claudeimplementation.md` whenever wallet economics or quest logic change.

