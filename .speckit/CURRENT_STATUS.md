# Fish Mouth – Current Development Status

**Last Updated**: 2025-10-14  
**Version**: 4.0  
**Phase**: 2B – Gamified Monetization & AI Ops  
**Overall Progress**: ~78%

---

## 🎯 Executive Snapshot

The platform is live with lead intelligence, admin tooling, and the new Wallet & Rewards layer. Work has shifted to polishing streaming voice intelligence, outreach orchestration, and Stripe hardening. All specs from `claudeimplementation.md` are now mirrored across Speckit; Cursor/Claude/Codex agents share identical context.

---

## ✅ What’s Production Ready

### Authentication & RBAC
- JWT + refresh, multi-role ACL, audited routes.
- Speckit: `.speckit/implementation/auth.md` (no changes this sprint).

### Lead Intelligence Pipeline
- Area scans → imagery normalization → ML inference hand-off → enrichment → scoring.
- Billing hooks now tie into wallet/credit ledger.
- Docs: `.speckit/features/lead-detection.md`.

### Admin Dashboard
- Revenue analytics, usage metering, Stripe summaries, one-click exports.
- Updated to surface wallet metrics + gamification stats.

### Wallet & Rewards Casino UX (NEW)
- Unified modal accessible from dashboard & settings.
- Preset chips, custom amounts, Stripe fallback, instant credits.
- Auto-spend toggles per channel with manual confirmation fallback.
- Daily quest rotation, streak bonuses, ledger preview.
- Docs: `.speckit/features/admin-dashboard.md`, `.speckit/implementation/IMPLEMENTATION_GUIDE.md`.

### Gamified Dashboard Experience (NEW)
- Sidebar brand badge, profile quick actions, header CTA, notification relocation.
- Confirmation modal for manual spend, celebration overlays, toast wiring.

---

## 🚧 In-Flight Work

| Area | Owner | Status | Notes |
|------|-------|--------|-------|
| Stripe session endpoint & webhook reconciliation | Backend | 🔄 60% | Fallback to instant credit works; need real session creation + idempotent webhooks. |
| AI Voice live streaming | Voice Team | 🔄 75% | Telnyx call control solid; streaming gRPC + Claude convo logic outstanding. |
| Outreach Orchestrator service (8007) | Growth | 🔄 45% | Foundation ready; needs SMS/email composers, default spend sliders, billing integration. |
| Claude-driven anomaly reviewer | Data Science | 🔄 30% | Tied to `claudeimplementation.md` ML roadmap; waiting on streaming output. |
| Kubernetes deployment playbooks | DevOps | 🔄 20% | Compose profile updated; need infra-as-code + CI. |

---

## 🧾 Backlog & TODOs

1. **Stripe Hardening**
   - Create `/api/wallet/top-up/stripe` session builder (amount/redirect).
   - Add webhook handler for `checkout.session.completed`; sync ledger + quests.
   - Update docs with live keys & rollback instructions.

2. **Voice Agent Streaming**
   - Finish Deepgram ASR + ElevenLabs TTS streaming pipeline.
   - Wire Claude conversation state machine.
   - Expand `WalletRewardsModal` confirmations to cover voice minute buys.

3. **Outreach Auto-Distribution**
   - Implement “auto-distribute credits” slider (default 35/35/30 SMS/email/voice).
   - Respect manual confirmation rules; leverage existing modal if toggle off.
   - Document flows in `.speckit/features/outreach.md` (new file).

4. **Production Ops**
   - Add Helm charts / K8s manifests aligning with ports 3000, 8000–8009.
   - Configure Prometheus (9090) + Grafana (3001) dashboards for the new services.

5. **Testing & QA**
   - Expand integration tests for wallet conversions and quest rotations.
   - Snapshot tests for `WalletRewardsModal` and settings Rewards card.
   - Load test voice streaming once pipeline is complete.

---

## 📌 Quick Reference

- **Wallet Modal Component**: `frontend/src/components/WalletRewardsModal.jsx`
- **State Synchronization**: localStorage keys (`fm_points`, `fm_wallet_balance`, `fm_credit_buckets`, etc.) + `fm-billing-refresh` custom event.
- **Daily Rotation Metadata**: stored in `fm_wallet_rotation_meta` (wave resets daily).
- **Gamification Keys**: quests (`fm_daily_rotation`), streak (`fm_login_streak`), ledger (`fm_point_history`).
- **Ports & Services**: see `.speckit/architecture/services.md` (updated with Claude spec).

---

## 🤝 Alignment Checklist for Agents

- Speckit, Claude spec, and codebase are synchronized as of this update.
- No hard-coded ports changed; new services use 8001–8009.
- When implementing new features, update both `claudeimplementation.md` **and** the corresponding Speckit section to avoid drift.

> **Next checkpoint**: once Stripe and voice streaming land, bump to Version 4.1 and graduate to Phase 3 (Outreach Automation).



