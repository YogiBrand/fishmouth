# Fish Mouth Architecture Overview

**Version**: 4.0  
**Phase**: 2B – Gamified Monetization & AI Ops  
**Last Updated**: 2025-10-14

---

## High-Level Topology

Fish Mouth delivers a full-stack AI platform spanning lead discovery, monetization, and omni-channel outreach. The system is organised into three tiers:

| Tier | Service / Component | Port | Status | Notes |
|------|---------------------|------|--------|-------|
| Experience | React SPA (Vite/Webpack) | 3000 | ✅ | Dashboard, admin portal, landing, wallet modal, quests |
| API Core | FastAPI monolith | 8000 | ✅ | Auth, leads, billing, wallet, quests, voice, reports, activity WS |
| Microservices | Scraper (8001), Image Processor (8002), ML Inference (8003), Enricher (8004), Contractor Acquisition (8005), AI Calling (8006), Outreach Orchestrator (8007), Lead Packager (8008), Master Orchestrator (8009) | 8001-8009 | ⚙️ / ⏳ | Ports reserved & partially implemented per claudeimplementation.md |
| Data Plane | PostgreSQL + PostGIS (5432), Redis (6379) | — | ✅ | Primary relational storage + caching/event queues |
| Observability | Prometheus (9090), Grafana (3001), Sentry, structlog | — | ⚙️ | Metrics tapped; dashboards rolling out with K8s deployment |

Shared storage uses S3-compatible buckets for imagery & reports. Local development mounts static uploads under `backend/uploads`.

---

## Request & Data Flow

```
Frontend (React, port 3000)
  ├─ REST/JSON → FastAPI (port 8000)
  │    ├─ SQLAlchemy ORM → PostgreSQL
  │    ├─ Redis pub/sub → activity + quest rotation
  │    ├─ Celery tasks → background orchestration
  │    └─ WebSockets → /ws/activity, /ws/scans/{id}
  └─ WebSockets → proxy → FastAPI (activity feed)
```

### Lead Intelligence Pipeline

1. **Scan Request**: `/api/scan/area` accepts area meta + spend estimate.
2. **Task Dispatch**: `LeadGenerationService.dispatch_background_scan` sends Celery job or inline coroutine (feature flag).
3. **Microservice Handoffs**:  
   `PropertyDiscoveryService` → `EnhancedRoofAnalysisPipeline` → `PropertyEnrichmentService` → `ContactEnrichmentService`.  
   Each stage records progress, stores results, and emits activity via Redis.
4. **Storage & Scoring**: Leads, scores, imagery metadata persisted to Postgres; CSV exports leverage streaming responses.
5. **Dashboard Consumption**: React components subscribe to WebSocket and REST endpoints for real-time updates.

### Wallet & Rewards Loop

1. **Modal Actions**: `WalletRewardsModal` triggers `/api/wallet/*` endpoints (instant or Stripe checkout).
2. **Ledger Updates**: `BillingUsage`, `WalletBalance`, `CreditLedger`, and `PointHistory` tables updated transactionally.
3. **Quest Engine**: `wallet.quest_rotation` keys persisted in Redis/localStorage to sync daily waves across tabs.
4. **Auto-Spend**: Toggles stored per user; background jobs allocate credits to channels (scans, voice, sms, email) using 4× API pricing.

### Voice Streaming (In-Flight)

Telnyx call control events hit `/api/webhooks/telnyx`, which validate signatures and fan out to the voice worker. Real-time audio will be streamed through `/api/voice/stream/{call_id}` once Deepgram ↔ ElevenLabs ↔ Claude loop is finalised. Wallet minutes are debited immediately or queued for manual approval depending on auto-spend state.

---

## Key Backend Modules

| Domain | Location | Responsibilities |
|--------|----------|------------------|
| Auth & RBAC | `backend/auth.py`, `backend/main.py` | JWT issuance, role enforcement, admin gating |
| Leads & Scans | `services/lead_generation_service.py`, `app/api/v1/dashboard.py` | Area scans, enrichment, scoring, dashboard metrics |
| Gamification | `app/services/activity_stream.py`, `app/services/dashboard_service.py` | Quest rotation, streak tracking, activity feed |
| Wallet & Billing | `services/billing_service.py`, `app/api/v1/dashboard.py` (metrics), pending wallet routes | Ledger aggregation, Stripe hooks, credit conversions |
| Voice Agent | `app/services/ai_voice_agent.py`, `services/voice_agent_service.py`, `services/voice/streaming.py` | Campaign orchestration, Telnyx control, analytics, (streaming WIP) |
| Sequences | `services/sequence_service.py`, `services/sequence_scheduler.py`, `services/sequence_delivery.py` | Automation flows, conditionals, delivery adapters |
| Reporting | `app/api/v1/reports.py`, `app/services/report_generator.py` | PDF/HTML report generation, background tasks |

Celery tasks reside in `backend/tasks/` for scans, sequences, and analytics roll-ups. Redis channels broadcast to the React WebSocket clients.

---

## Frontend Composition

- **Pages**: `Dashboard.jsx`, `AdminDashboard.jsx`, `Home.jsx`, auth flows.  
  Each page consumes API hooks via `frontend/src/services/api.js` and shares Auth state through `contexts/AuthContext.jsx`.
- **Lead Intelligence Suite**: `LeadIntelligenceTable.jsx`, `EnhancedLeadDetailPage.jsx`, `DashboardLeadMap.jsx`, `AreaScanner.jsx`.
- **Gamification & Wallet**: `WalletRewardsModal.jsx`, `PointsLedgerModal.jsx`, `DashboardQuestPanel.jsx`, `SmartOnboardingAssistant.jsx`.
- **Voice & Outreach**: `VoiceCallManager.jsx`, `SequenceManager.jsx`, `SequenceBuilder.jsx` (UI scaffold), `WorkflowAutomation.jsx`.
- **Shared Utilities**: `utils/errorHandling.js`, `utils/analytics.js`, and localStorage schema documented in CONFIGURATION_REFERENCE.

---

## Security & Compliance

- **PII Handling**: Encryption via `services.encryption.encrypt_value`, hashed PII for dedupe, audit logging for sensitive actions.
- **Webhook Validation**: Telnyx Ed25519 / HMAC hybrid; Stripe webhook secret gating; activity log persisted for forensic tracing.
- **RBAC**: Contractor vs admin vs superadmin roles; admin routes protected by `get_current_admin`.
- **Secrets Management**: `.env` plus deployment secrets; refer to CONFIGURATION_REFERENCE for mandatory values.

---

## Observability & Operations

- Structured logging with `structlog` bound to `X-Request-ID`.
- Prometheus instrumentation toggled via config (`settings.instrumentation.enable_prometheus`).
- Sentry DSN optional but recommended for production.
- Quest rotations and wallet events publish to activity stream; missing events should trigger alert (future work).
- Kubernetes migration planned: Helm charts will expose services on reserved ports with liveness/readiness probes.

---

## Roadmap Notes

1. **Stripe Checkout**: Replace instant credit fallback with session builder, webhook reconciliation, and ledger sync.
2. **Voice Streaming**: Deploy Deepgram/ElevenLabs connectors, conversation state machine, and call waveform UI tiles.
3. **Outreach Orchestrator**: Dedicated service on port 8007 orchestrating SMS/email campaigns with credit auto-distribution (35/35/30 default).
4. **Kubernetes Tooling**: Helm charts + Prometheus/Grafana dashboards for each microservice; integrate with Sentry release health.
5. **Claude Vision Enhancements**: Extend inference pipeline for richer anomaly classification per claudeimplementation.md.

Keep this file synchronised with `claudeimplementation.md` whenever services are added or ports shift. When a microservice graduates from planned to live, update the status column and link its documentation.




