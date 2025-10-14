# Fish Mouth Implementation Guide (Agent Edition)

**Phase**: 2B – Gamified Monetization & AI Ops  
**Version**: 4.0  
**Audience**: Claude, Cursor, Codex, and engineering teammates needing fast onboarding  
**Last Updated**: 2025-10-14

---

## 1. Snapshot

| Item | Details |
|------|---------|
| Product | AI-powered roofing platform covering lead discovery, wallet monetization, outreach, and AI voice |
| Frontend | React 18 SPA (`frontend/`), Tailwind-style utility classes, lucide-react icons, Mapbox maps |
| Backend | FastAPI (`backend/main.py`), PostgreSQL + PostGIS, Redis, Celery, Anthropic Claude, Telnyx, Stripe |
| Services | Reserved microservices on ports 8001–8009 per `claudeimplementation.md` (scraper, imagery, inference, enricher, outreach, etc.) |
| Key Docs | `.speckit/project.yaml`, `.speckit/architecture/overview.md`, `.speckit/CURRENT_STATUS.md`, `claudeimplementation.md` |
| Active Focus | Stripe checkout & webhooks, AI voice streaming loop, outreach orchestrator dashboards, Kubernetes rollout |

---

## 2. Directory Cheatsheet

```
backend/
  main.py                  # FastAPI app entry point, routers, models
  app/api/v1/              # Modular API routes (dashboard, voice, reports, branding, webhooks)
  app/services/            # Wallet, activity stream, Claude-powered voice agent (AIVoiceAgentService)
  services/                # Legacy/core services (lead generation, sequences, billing, voice streaming WIP)
  tasks/                   # Celery workers (scans, sequences, analytics)
  models.py                # SQLAlchemy ORM (23+ models)
frontend/src/
  pages/                   # Dashboard, AdminDashboard, Home, auth views
  components/              # Wallet modal, quest panel, lead intelligence, voice manager, sequence manager
  services/api.js          # REST client (axios wrapper) with mock data fallbacks
  contexts/AuthContext.jsx # JWT persistence
.speckit/                  # Documentation canon (this guide, features, architecture, status)
```

---

## 3. First-Hour Checklist

1. **Read** `.speckit/project.yaml`, `.speckit/architecture/overview.md`, `.speckit/CURRENT_STATUS.md`.
2. **Skim** `claudeimplementation.md` for roadmap alignment (ports, features, future flows).
3. **Set up** local environment (`.speckit/deployment/local-development.md`).
4. **Run** frontend + backend (via docker-compose or local `npm start` / `uvicorn`).
5. **Review** key components:
   - Dashboard: `frontend/src/pages/Dashboard.jsx`
   - Wallet modal: `frontend/src/components/WalletRewardsModal.jsx`
   - Lead pipeline: `backend/services/lead_generation_service.py`
   - Voice agent: `backend/app/services/ai_voice_agent.py`
6. **Inspect** admin telemetry: `frontend/src/pages/AdminDashboard.jsx`.

---

## 4. Feature Modules & Key Files

| Domain | Files | Notes |
|--------|-------|-------|
| Lead Discovery | `services/lead_generation_service.py`, `services/providers/*`, `frontend/src/components/AreaScanner.jsx`, `LeadIntelligenceTable.jsx` | Scans feed websocket progress + dashboard table |
| Wallet & Rewards | `frontend/src/components/WalletRewardsModal.jsx`, `PointsLedgerModal.jsx`, `Dashboard.jsx`, `backend/services/billing_service.py` | LocalStorage sync + upcoming Stripe endpoints |
| Quests & Gamification | `DashboardQuestPanel.jsx`, `Dashboard.jsx`, `CONFIGURATION_REFERENCE.md` | Daily wave rotation, streaks, celebration overlays |
| Voice Agent | `app/services/ai_voice_agent.py`, `app/api/v1/ai_voice.py`, `frontend/src/components/VoiceCallManager.jsx` | Campaigns live, streaming loop in progress |
| Reports & Branding | `app/api/v1/reports.py`, `ReportGeneratorService`, `frontend/src/components/ReportPreviewModal.jsx`, `AdminDashboard.jsx` | Async report generation + admin marketing tools |
| Admin Monitoring | `frontend/src/pages/AdminDashboard.jsx`, `app/services/dashboard_service.py`, `services/billing_service.py` | Wallet telemetry, revenue analytics, manual confirmation queue |
| Outreach Automation | `services/sequence_service.py`, `SequenceManager.jsx`, `SequenceBuilder.jsx` | Works with current sequence engine, pending orchestrator upgrades |

---

## 5. Development Playbook

### Local Environment
- Copy `.env.example` → `.env`; populate keys (Anthropic, Telnyx, Stripe, Mapbox, Deepgram, ElevenLabs).
- Start stack: `docker-compose up` or run PostgreSQL/Redis locally and launch:
  ```bash
  # Backend
  cd backend
  uvicorn main:app --reload

  # Frontend
  cd frontend
  npm install
  npm start
  ```
- Docs: `http://localhost:3000` (SPA), API docs at `http://localhost:8000/docs`.

### Database & Migrations
- Alembic environment under `backend/alembic/`.
- Run migrations: `alembic upgrade head`.
- Seed data (optional): `python seed_database.py`.

### Testing & QA
- Python tests: `pytest backend/tests`.
- Frontend tests (if enabled): `npm test`.
- Manual flows to verify after wallet/quest changes: add funds, toggle auto-spend, complete quests, run scan, launch voice campaign, confirm admin telemetry.

---

## 6. Common Tasks & Entry Points

| Task | Where to Start | Notes |
|------|----------------|-------|
| Modify scoring | `LeadScoringEngine` in `lead_generation_service.py` | Update docs + admin metrics if weights change |
| Add wallet endpoint | `backend/app/api/v1/dashboard.py` or new router under `/api/v1/wallet` | Ensure ledger + admin telemetry updates |
| Adjust quests | `Dashboard.jsx`, `DashboardQuestPanel.jsx`, quest config in CONFIGURATION_REFERENCE | Maintain streak logic & localStorage schema |
| Extend voice agent | `app/services/ai_voice_agent.py`, `services/voice/streaming.py` | Keep wallet cost debits in sync |
| Update admin charts | `AdminDashboard.jsx`, `dashboard_service.py` | Document metrics in `features/admin-dashboard.md` |
| Document new feature | Update `.speckit/features/*.md`, `.speckit/CURRENT_STATUS.md`, `claudeimplementation.md` |

---

## 7. Deployment & Ops

- Docker compose supports backend, frontend, PostgreSQL, Redis, Celery.
- Kubernetes migration planned; maintain port assignments (3000, 8000–8009, 9090, 3001).
- Observability: Prometheus instrumentation toggled via settings, Sentry optional, structlog with `X-Request-ID`.
- Webhooks: Telnyx signature verification in `main.py`; Stripe webhook handler to be finalised.

---

## 8. Documentation Contract

Whenever functionality changes:
1. Update the relevant code.
2. Reflect change in `claudeimplementation.md`.
3. Update Speckit entries:
   - `.speckit/CURRENT_STATUS.md`
   - `.speckit/COMPREHENSIVE_SUMMARY.md`
   - Feature docs (`.speckit/features/*.md`)
   - Architecture/media references if ports/services shift.
4. Ping admin telemetry docs if wallet or billing flows are touched.

---

## 9. Need Help?

- `dev@fishmouth.com` – engineering pod
- `support@fishmouth.com` – ops escalation
- Check `ABSOLUTE_FINAL_CHECKLIST.md` and `CURRENT_STATUS.md` before major merges.

This guide is intentionally concise. For deeper context, dive into the linked feature files or the Claude master specification. Keep Speckit synchronized so Claude/Cursor/Codex remain in agreement.




