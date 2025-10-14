# Fish Mouth – Comprehensive System Summary

**Date**: 2025-10-14  
**Version**: 4.0  
**Platform Phase**: 2B – Gamified Monetization & AI Ops  
**Overall Completion**: 78%

---

## 🚀 Executive Snapshot

Fish Mouth has evolved from a data-first roofing lead engine into an **AI-assisted revenue platform**. Core scanning, enrichment, and dashboards are stable; the last sprint delivered the **Wallet & Rewards casino experience**, **credit routing**, and **daily quest rotation**. Claude/Cursor and Codex now have parity documentation for every module so future agents can continue where this build leaves off.

### Highlights Since v3.0
- ✅ Unified **Wallet & Rewards modal** with Stripe-ready flows, instant credits, point exchanges, and auto-spend toggles.
- ✅ **Gamified dashboard sidebar** with brand badge, streak tracking, and profile-driven quick actions.
- ✅ **Daily rotation engine** powering quests, rewards, and streak bonuses (shared across dashboard & settings).
- ✅ **Manual approval + auto-spend logic** for wallet debits, including confirmation popups and transaction ledgering.
- ✅ Claude specification (`claudeimplementation.md`) integrated throughout Speckit—architecture, ports, workflows, and AI scopes are now synchronized.

### Current Focus
- ⏳ Finish streaming layer for **AI Voice Agent** (final 15% of live-call intelligence).
- ⏳ Expand **Outreach Orchestrator** (SMS/email sequences + billing hooks).
- ⏳ Harden **microservice deployments** for Scraper/Image/Inference clusters before production roll-out.

---

## 🧭 Updated Platform Topology

| Layer | Service | Port | Status | Notes |
|-------|---------|------|--------|-------|
| UI | Next.js Frontend | **3000** | ✅ | Wallet & rewards modal, dashboard, admin controls |
| API Core | FastAPI Backend | **8000** | ✅ | Auth, leads, billing, voice, quests |
| Data Ingest | Scraper Service | **8001** | ⚙️ | Tiered permit scraping (Crawl4AI → Playwright → Selenium) |
| Imagery | Image Processor | **8002** | ✅ | Imagery normalization, Real-ESRGAN upscale |
| CV/ML | Inference Service | **8003** | ⚙️ | YOLOv8 roof anomalies, damage scoring |
| Contact | Enricher Service | **8004** | ✅ | Enrichment + contact validation |
| Supply | Contractor Acquisition | **8005** | ⚙️ | Contractor prospecting + scoring |
| Voice | AI Call Service | **8006** | ⏳ | Telnyx call control, live streaming in progress |
| Outreach | Campaign Orchestrator | **8007** | ⏳ | Multi-channel sequences, credit routing |
| Product | Lead Generator | **8008** | ✅ | Pricing, clustering, pipeline packaging |
| Ops | Master Orchestrator | **8009** | ⚙️ | Schedules pipelines and monitors SLAs |
| Shared | PostgreSQL + PostGIS | **5432** | ✅ | Primary datastore (23 tables) |
| Shared | Redis | **6379** | ✅ | Queues, cached quest rotation |
| Observability | Prometheus | **9090** | ⚙️ | Metrics; Grafana dashboards on **3001** |

Ports not listed in claude spec remain unchanged; new services adopt 8001–8009 slots to preserve developer ergonomics.

---

## 🧩 Modules & Feature Status

### 1. Core Infrastructure ✅
- Docker Compose profiles for local microservices.
- Celery + Redis worker pool orchestrating scans, enrichment, ML, and billing hooks.
- Structured logging (structlog), Sentry integration and Prometheus instrumented.

### 2. Authentication & Permissions ✅
- JWT auth with refresh, multi-role RBAC (contractor, admin, superadmin).
- Session persistence + protected routes.
- Docs updated for onboarding (Speckit `implementation/` stack).

### 3. Admin Experience ✅
- Revenue analytics, usage metering, Stripe ledgering.
- System health metrics and exports.
- Admin docs synced (`features/admin-dashboard.md`).

### 4. Lead Intelligence Pipeline ✅
- Area scanning with tiered fallback data sources.
- Imagery analysis handing off to Inference service.
- Lead scoring + clustering, CSV exports, manual status updates.
- Monetization pipeline (cost per scan, auto-debit) wired through new wallet module.

### 5. Voice AI Stack ⏳ (85%)
- Telnyx call flow, call/turn/event models, cost ledgering.
- Remaining: real-time streaming grain & Claude/LLM callbacks (tracked in CURRENT_STATUS).

### 6. Wallet & Rewards 🎰 ✅
- Modal with two tabs (Wallet, Rewards) accessible from dashboard sidebar and settings.
- Preset chip values ($20/50/75/100/250), custom input, Stripe checkout fallback, instant crediting.
- Auto-spend toggles per channel (SmartScan, Voice minutes, SMS, Email) with manual confirmation fallback.
- Daily quest rotation (wave-tracked), point ledger preview, premium quest guidance.
- Unified localStorage keys and cross-tab event dispatch so dashboard/settings stay in sync.

### 7. Gamification & Experience ✅
- Sidebar rebrand (Fish avatar, profile summary, wallet metrics).
- Streak tracking with weekly bonus triggers, quest completion toasts, celebration overlays.
- Confirmation modal for manual spend (wallet & points) with itemized mini invoice.

### 8. Upcoming Modules
- 🟡 Outreach sequences (Port 8007) – SMS/email orchestration and billing multipliers.
- 🟡 Claude-assisted lead scorer – tie-in with `claudeimplementation.md` workflows.
- 🟡 Production-ready deployment playbooks (Kubernetes) – tracked in `deployment/`.

---

## 📦 Data Models & Storage

- **Lead** + **AreaScan** + **LeadActivity** – hero tables for the pipeline.
- **WalletBalance**, **CreditLedger**, **PointHistory** – new monetization tables (backend migrations complete).
- **QuestRotation**, **QuestCompletion** – track daily waves + completions.
- **VoiceCall*** family – ready for streaming integration.

Refer to `.speckit/architecture/data-models.md` (updated) for class diagrams and relationships.

---

## 🔌 API & Frontend Touchpoints

- `/api/wallet/top-up/stripe` – placeholder for Stripe session creation (returns checkout URL or triggers instant credit fallback).
- `/api/wallet/convert` – moves wallet cash to feature credits with billing markup (4× API cost).
- `/api/rewards/quests` – rotation + completion logging (shared by dashboard & settings).
- Frontend entry points:
  - `Dashboard.jsx` – sidebar card, header CTA, quest widget wiring.
  - `ComprehensiveBusinessSettings.jsx` – Rewards tab auto-launches modal and summarizes routing state.
  - `WalletRewardsModal.jsx` – reusable modal component powering both experiences.

---

## 🧠 AI & Automation Alignment

**Claude/Cursor roadmap** (`claudeimplementation.md`) is now fully mirrored:
- Microservice ports and responsibilities.
- Workflow orchestration (scrape → enrich → lead pack).
- ClaudeVision and LLM prompts reserved for upcoming ML enhancements.
- Credit/points economics documented with 4× margin for profitability.

All new documents incorporate Cursor/Claude developer notes so either agent can pick up tasks without missing context.

---

## 📌 Outstanding Tasks (Tracked in CURRENT_STATUS)

1. Integrate real Stripe session creation + webhook reconciliation.
2. Finish voice streaming pipeline + Claude real-time intent handling.
3. Productionize Outreach orchestrator (Port 8007) with default spend sliders (industry best-practice allocation set at 35% SMS / 35% email / 30% voice when auto-distribute enabled).
4. Harden confirmation flows for future AI-driven feature usage (notifications, invoices).

---

## 📚 Reference Documentation Updated

- `.speckit/project.yaml` – metadata, phases, agents.
- `.speckit/architecture/overview.md` – high-level topology, microservice ports, data flow.
- `.speckit/CURRENT_STATUS.md` – sprint board w/ blockers.
- `.speckit/features/admin-dashboard.md` – includes wallet/gamification hooks.
- `.speckit/features/wallet-rewards.md` – casino UX, quests, ledger schema.
- `.speckit/implementation/IMPLEMENTATION_GUIDE.md` – assistant onboarding, setup, workflows.
- `.speckit/implementation/CONFIGURATION_REFERENCE.md` – wallet env vars, auto-spend defaults.
- `claudeimplementation.md` – canonical spec; referenced throughout Speckit entries.

---

## ✅ TL;DR for Agents

Fish Mouth now merges advanced lead intelligence with casino-grade monetization UX. Wallet credits, point systems, and quest rotations are in production; auto-spend can be toggled per channel. The Claude specification is the north star for upcoming microservices and outreach engines. All documentation has been realigned in Speckit so Cursor/Claude/Codex agents can collaborate without drift.



