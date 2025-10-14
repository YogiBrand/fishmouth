# Local Development Guide (Fish Mouth)

**Last Updated**: 2025-10-14  
**Supports**: Backend (FastAPI), Frontend (React), Celery workers, PostgreSQL, Redis, mock microservices

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Docker Desktop | ≥ 20.10 | Recommended for one-command spin up |
| Docker Compose | ≥ 2.0 | Bundled with Docker Desktop |
| Python | 3.11.x | Optional if running backend outside Docker |
| Node.js | 18.x | CRA-based frontend |
| npm | 9.x | Install dependencies |
| Git | Latest | Source control |

Optional: `psql`, `pgcli`, `TablePlus`, or `pgAdmin` for DB inspection; `HTTPie` or `curl` for API testing.

---

## 2. Environment Setup

```bash
cp .env.example .env
```

Populate `.env` with provider keys. Minimum viable set:

```
# Core
DATABASE_URL=postgresql://fishmouth:fishmouth@postgres:5432/fishmouth
REDIS_URL=redis://redis:6379/0
JWT_SECRET_KEY=replace-with-openssl-rand-hex-32

# AI / Comms
ANTHROPIC_API_KEY=sk-ant-...
DEEPGRAM_API_KEY=dg-...
ELEVENLABS_API_KEY=eleven-...
TELNYX_API_KEY=telnyx-...
TELNYX_FROM_NUMBER=+15555555555
TELNYX_CONNECTION_ID=conn_xxx
TELNYX_MESSAGING_PROFILE_ID=msgprof_xxx
TELNYX_WEBHOOK_PUBLIC_KEY=base64-ed25519-key  # or TELNYX_WEBHOOK_SECRET
VAPI_API_KEY=vapi_...

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CHECKOUT_SUCCESS_URL=http://localhost:3000/dashboard?wallet=success
STRIPE_CHECKOUT_CANCEL_URL=http://localhost:3000/dashboard?wallet=cancel

# Maps & Data
MAPBOX_TOKEN=pk.abc...
GOOGLE_MAPS_API_KEY=AIza...
PROPERTY_ENRICHMENT_API_KEY=...
CONTACT_ENRICHMENT_API_KEY=...

# Monitoring (optional)
SENTRY_DSN=https://...
PROMETHEUS_ENABLED=true
```

Wallet-specific overrides documented in `.speckit/implementation/CONFIGURATION_REFERENCE.md`.

---

## 3. Running the Stack

### Option A – Docker Compose (Recommended)

```bash
docker-compose up --build
```

Services launched:

| Container | Port | Purpose |
|-----------|------|---------|
| `backend` | 8000 | FastAPI app + Celery worker | 
| `frontend` | 3000 | React SPA |
| `postgres` | 5432 | PostgreSQL + PostGIS |
| `redis` | 6379 | Cache, Celery broker, quest rotation |

Reserved (commented in compose file, enable as needed):
| Service | Port | Notes |
|---------|------|-------|
| `scraper` | 8001 | Permit ingestion (future) |
| `image-processor` | 8002 | Real-ESRGAN pipeline |
| `ml-inference` | 8003 | YOLOv8 server |
| `outreach-orchestrator` | 8007 | SMS/email sequences |

Logs:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Option B – Manual

1. **Database & Redis**
   ```bash
   docker run --name fishmouth-postgres -e POSTGRES_PASSWORD=fishmouth -p 5432:5432 postgres:15
   docker run --name fishmouth-redis -p 6379:6379 redis:7
   ```
2. **Backend**
   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn main:app --reload --port 8000

   # Celery worker (optional)
   celery -A celery_app.celery_app worker --loglevel=info
   ```
3. **Frontend**
   ```bash
   cd frontend
   npm install
   npm start  # http://localhost:3000
   ```

---

## 4. Database & Seed Data

```bash
docker-compose exec backend alembic upgrade head
docker-compose exec backend python seed_database.py  # optional demo data
```

PostgreSQL connection string for tooling:
```
postgresql://fishmouth:fishmouth@localhost:5432/fishmouth
```

---

## 5. Useful Commands

| Action | Command |
|--------|---------|
| Reformat backend | `ruff check backend --fix` (if configured) |
| Run tests | `pytest backend/tests` |
| Generate report | `curl -X POST http://localhost:8000/api/v1/reports/generate?property_id=...` |
| Launch voice campaign | `http POST :8000/api/v1/ai-voice/campaign lead_ids:='["lead-id"]' contractor_id=...` |
| Watch activity WS | Use `wscat -c ws://localhost:8000/ws/activity` |

---

## 6. Ports & URLs

| Port | Service |
|------|---------|
| 3000 | React SPA |
| 8000 | FastAPI API + WebSockets |
| 8001–8009 | Reserved microservices (see architecture overview) |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 9090 | Prometheus (if enabled) |
| 3001 | Grafana (future) |

Frontend proxies API via `frontend/src/setupProxy.js`, enabling relative fetches (`/api/...`).

---

## 7. Voice & Webhooks (Local)

1. Expose local server using `ngrok` or `cloudflared` (required for Telnyx/Stripe webhooks).
   ```bash
   ngrok http 8000
   ```
2. Configure webhook URLs:
   - Telnyx: `https://<ngrok-id>.ngrok.io/api/webhooks/telnyx`
   - Stripe: `https://<ngrok-id>.ngrok.io/api/webhooks/stripe`
3. Update `.env` with public URL for webhook validation.

Without external tunnels, you can replay stored webhook fixtures during development.

---

## 8. Troubleshooting

| Issue | Fix |
|-------|-----|
| `psycopg2` fails to connect | Ensure Postgres is running and credentials match `.env` |
| Cannot reach API from frontend | Confirm proxy in `frontend/src/setupProxy.js` and backend running on port 8000 |
| Wallet data not syncing across tabs | Verify `fm-billing-refresh` storage event; clear localStorage between sessions |
| Voice campaign errors | Check Telnyx credentials, confirm `ANTHROPIC_API_KEY` set, inspect `backend/app/services/ai_voice_agent.py` logs |
| Stripe checkout stub | Until live endpoint implemented, instant credit fallback is used; watch CURRENT_STATUS for updates |

---

## 9. Clean Up

```bash
docker-compose down -v   # stop services and remove volumes
docker rm -f fishmouth-postgres fishmouth-redis  # if you launched manually
```

Need full reset? Drop volumes and re-run migrations:
```bash
docker volume rm fishmouth_postgres_data
```

---

Keep this guide updated whenever ports, environment variables, or service start-up commands change. Always cross-reference with `claudeimplementation.md` and `.speckit/CURRENT_STATUS.md` after major infrastructure work.




