# API Surface Overview

**Base URLs**
- Development: `http://localhost:8000`
- Production: `https://api.fishmouth.com` (TBD)

All protected endpoints expect `Authorization: Bearer <JWT>` header. Obtain tokens via `/auth/login`.

---

## Auth & Session

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/signup` | POST | Create contractor account |
| `/auth/login` | POST | Get JWT + user payload |
| `/auth/me` | GET | Current user profile |

---

## Dashboard & Leads (`backend/app/api/v1/dashboard.py`)

| Endpoint | Method | Notes |
|----------|--------|-------|
| `/api/v1/dashboard/stats` | GET | Overview metrics (leads, conversion funnel, clusters) |
| `/api/v1/dashboard/active-clusters` | GET | Active contagion clusters (query `limit`) |
| `/api/v1/dashboard/activity` | GET | Recent lead activities (limit) |
| `/api/v1/dashboard/hot-leads` | GET | High-score leads (query `min_score`, `limit`) |

Lead management endpoints live in `backend/main.py` legacy routes:

| Endpoint | Method | Notes |
|----------|--------|-------|
| `/api/scan/estimate` | POST | Estimate cost & property count (AreaScanner) |
| `/api/scan/area` | POST | Launch area scan |
| `/api/scans` | GET | List scans |
| `/api/scans/{scan_id}` | GET | Scan detail |
| `/api/leads` | GET | Filtered leads |
| `/api/leads/{lead_id}` | GET | Lead detail |
| `/api/leads/{lead_id}` | PATCH | Update status/notes |
| `/api/leads/export` | GET | CSV export (filters) |

WebSockets:
- `/ws/scans/{scan_id}` – scan progress feed
- `/ws/activity` – global activity events (wallet, quests, calls, reports)

---

## Reports & Branding

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/reports/generate` | POST | Queue shareable report for property + contractor |
| `/api/v1/reports/report/{report_id}` | GET | Render report HTML |
| `/api/v1/reports/report/{report_id}/download` | POST | Generate/download PDF |
| `/api/v1/branding/profile/{contractor_id}` | GET | Contractor branding profile |
| `/api/v1/branding/showcase/{contractor_id}` | POST | Generate landing page showcase |

---

## AI Voice Agent

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/ai-voice/campaign` | POST | Launch AI voice campaign for lead IDs |
| `/api/v1/ai-voice/follow-up` | POST | Schedule follow-up sequence (`sequence_type`) |
| `/api/voice/calls` | GET | Voice call list (params: status, outcome, limit) |
| `/api/voice/calls/{call_id}` | GET | Call detail + transcript |
| `/api/voice/analytics` | GET | Rolling metrics |
| `/api/voice/config` | GET/PUT | Voice configuration (per user) |
| `/api/voice/stream/{call_id}` | WS | Streaming bridge (in development) |

Webhooks:
- `/api/webhooks/telnyx` – Telnyx call control events

---

## Sequences & Outreach

Primary service located under `backend/services/sequence_service.py`. REST endpoints currently on legacy routes:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sequences` | GET/POST | List/create sequences |
| `/api/sequences/{sequence_id}` | GET/PUT | Fetch/update sequence |
| `/api/sequences/{sequence_id}/enroll` | POST | Enroll lead |
| `/api/sequences/pending` | GET | Pending executions (admin) |

Upcoming outreach orchestrator (port 8007) will introduce `/api/v1/outreach/*`.

---

## Wallet, Rewards & Billing (WIP)

Current REST surface lives in dashboard routes; dedicated wallet router coming with Stripe integration.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallet/top-up/instant` | POST | Instant credit fallback (currently called internally) |
| `/api/wallet/top-up/stripe` | POST | **Planned** – Create Stripe checkout session |
| `/api/wallet/convert` | POST | Convert wallet cash to channel credits |
| `/api/wallet/quests` | GET/POST | **Planned** – Daily quest rotation & completion |
| `/api/admin/wallet/summary` | GET | **Planned** – Admin wallet telemetry |
| `/api/admin/wallet/manual-confirmations` | GET/POST | **Planned** – Manual approval queue |

Billing:
- `/api/admin/billing/usage` – aggregate usage (supports `period`, `user_id`)
- `/api/admin/billing/export` – CSV export (range filters)

Stripe webhook handler: `/api/webhooks/stripe` (pending final integration).

---

## Mailers & Outreach Assets

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/mailers/templates` | GET | Fetch direct mail templates |
| `/api/v1/mailers/campaigns` | POST | Launch direct mail campaign (contractor context) |

---

## Response Conventions

Successful responses usually return:
```json
{
  "status": "ok",
  "data": {...}
}
```

Errors follow FastAPI default schema:
```json
{
  "detail": "Explanation"
}
```

Pagination: use `?offset=` and `?limit=`; responses include `total` and `has_more` when relevant.

---

## Docs & Specs

- FastAPI OpenAPI docs: `http://localhost:8000/docs`
- Refer to `.speckit/apis/*.md` for endpoint-specific payloads.
- Keep this summary updated whenever new routers are introduced or endpoints graduate from planned → live.




