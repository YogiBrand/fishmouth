# Codex Playbook — **Single Agent** (All Kits: v1, v2, Admin)
**Assume base path:** `/home/yogi/fishmouth`
**Folders present:**
- `/home/yogi/fishmouth/roofing_app_improvement_kit_v1`
- `/home/yogi/fishmouth/roofing_app_improvement_kit_v2`
- `/home/yogi/fishmouth/roofing_admin_kit_v1`
- `/home/yogi/fishmouth/roofing_exec_playbooks_and_admin_ext_v3` (this bundle)

> Work sequentially. Commit small atomic changes. Do not replace existing files unless a full replacement is provided below. Otherwise, apply the ordered diffs.

---
## 0. Preflight
1. Ensure Docker and Docker Compose are installed.
2. Create `.env` at repo root with keys from `roofing_app_improvement_kit_v2/config/.env.example` and `roofing_admin_kit_v1/docs/setup_full.md`.
3. Run: `docker --version && docker compose version`.

---
## 1. Copy services and configs into the monorepo
**Target repo layout:** `/home/yogi/fishmouth/app`

1. Create structure (skip if exists):
   - `/home/yogi/fishmouth/app/services/`
   - `/home/yogi/fishmouth/app/config/`
   - `/home/yogi/fishmouth/app/observability/`
   - `/home/yogi/fishmouth/app/sql/`
2. Copy from v1 kit:
   - `code-starters/ai_gateway` → `/home/yogi/fishmouth/app/services/ai-gateway-8023`
   - `code-starters/vision_ai` → `/home/yogi/fishmouth/app/services/vision-8024`
   - `code-starters/mapping_intel` → `/home/yogi/fishmouth/app/services/mapping-8025`
   - `code-starters/quality_engine` → `/home/yogi/fishmouth/app/services/quality-8026`
   - `code-starters/osint_contacts` → `/home/yogi/fishmouth/app/services/osint-8027`
   - `code-starters/event_monitor` → `/home/yogi/fishmouth/app/services/events-8028`
   - `config/docker-compose.additions.yml` → `/home/yogi/fishmouth/app/config/docker-compose.additions.yml`
   - `prompts/*` → `/home/yogi/fishmouth/app/prompts/`
3. Copy from v2 kit:
   - `code-starters/address_lookup` → `/home/yogi/fishmouth/app/services/address-8022`
   - `config/docker-compose.tiles.yml` → `/home/yogi/fishmouth/app/config/docker-compose.tiles.yml`
   - `Makefile` → `/home/yogi/fishmouth/app/Makefile`
   - `scripts/ops/healthcheck.sh` → `/home/yogi/fishmouth/app/scripts/ops/healthcheck.sh`
   - Place OSM MBTiles under `/home/yogi/fishmouth/app/tiles/` and NAIP COGs under `/home/yogi/fishmouth/app/imagery/` (optional).
4. Copy from **admin kit**:
   - `telemetry-gw` → `/home/yogi/fishmouth/app/services/telemetry-8030`
   - `admin-api` → `/home/yogi/fishmouth/app/services/admin-api-8031`
   - `admin-ui` → `/home/yogi/fishmouth/app/admin-ui`
   - `observability/*` → `/home/yogi/fishmouth/app/observability/`
   - `sql/migrations` → `/home/yogi/fishmouth/app/sql/migrations`
5. Copy **this bundle** (v3 extensions):
   - `admin-api-ext/*` → `/home/yogi/fishmouth/app/services/admin-api-8031/app/`
   - `admin-ui-ext/*` → `/home/yogi/fishmouth/app/admin-ui/src/ui/pages/` and update nav as instructed below.
   - `ai-gateway-ext/main.py` → overwrite `/home/yogi/fishmouth/app/services/ai-gateway-8023/app/main.py`
   - `billing-gateway/*` (optional) → `/home/yogi/fishmouth/app/services/billing-gw-8032`
   - `docs/*.md` for references.

---
## 2. Database migrations
1. Run Postgres migrations:
   ```bash
   psql $DATABASE_URL -f /home/yogi/fishmouth/roofing_admin_kit_v1/sql/migrations/001_analytics_schema.sql
   ```
2. (Optional) Add your app tables if not present.

---
## 3. Wire telemetry middleware in each FastAPI service
For each service in `/app/services/*`, add the provided middleware from:
`/home/yogi/fishmouth/roofing_admin_kit_v1/telemetry-gw/README.md`.

- Emit **usage** on every request.
- Emit **cost** when LLM/SMS/voice/premium imagery are used.

---
## 4. Replace AI Gateway with quota/budget version
Overwrite file:
- From: `/home/yogi/fishmouth/roofing_exec_playbooks_and_admin_ext_v3/ai-gateway-ext/main.py`
- To:   `/home/yogi/fishmouth/app/services/ai-gateway-8023/app/main.py`

Set env:
```
AI_MAX_RPM=20
AI_MAX_TOKENS_PER_MIN=20000
AI_BUDGET_USD_DAILY=1.00
AI_COST_PER_1K_TOKENS_USD=0.002
TELEMETRY_URL=http://telemetry-gw_8030:8030
```

---
## 5. Admin API extensions (Messaging, Deliverability, Jobs/Queues)
Copy files from:
- `/home/yogi/fishmouth/roofing_exec_playbooks_and_admin_ext_v3/admin-api-ext/*`
into: `/home/yogi/fishmouth/app/services/admin-api-8031/app/`

Install new dependency: add `dnspython` to `requirements.txt` and rebuild the image.

Endpoints added:
- `GET /messaging/providers` / `POST /messaging/providers`
- `POST /messaging/providers/test`
- `POST /messaging/domain/verify` (SPF/DKIM/DMARC check via DNS)
- `POST /messaging/dkim/generate` (self-host flow — returns suggested DNS TXT)
- `POST /cloudflare/dns/apply` (optional Cloudflare integration)
- `GET /queues/jobs` (proxy Orchestrator :8001) and `GET /queues/jobs/<built-in function id>`

---
## 6. Admin UI (Messaging + Jobs/Queues pages)
1. Copy React pages from:
   - `/home/yogi/fishmouth/roofing_exec_playbooks_and_admin_ext_v3/admin-ui-ext/Messaging.jsx`
   - `/home/yogi/fishmouth/roofing_exec_playbooks_and_admin_ext_v3/admin-ui-ext/JobsQueues.jsx`
2. Place them under:
   - `/home/yogi/fishmouth/app/admin-ui/src/ui/pages/`
3. Update `/home/yogi/fishmouth/app/admin-ui/src/ui/App.jsx` nav:
   - Add links to `/messaging` and `/jobs` routes.
4. Rebuild UI:
   ```bash
   cd /home/yogi/fishmouth/app/admin-ui
   cp .env.example .env  # ensure VITE_ADMIN_API set to http://localhost:8031
   npm i && npm run dev
   ```

---
## 7. Observability
Bring up Prometheus/Grafana/Loki compose overlay:
```
docker compose -f docker-compose.yml   -f /home/yogi/fishmouth/app/config/docker-compose.additions.yml   -f /home/yogi/fishmouth/app/config/docker-compose.tiles.yml   -f /home/yogi/fishmouth/app/observability/docker-compose.observability.yml up -d
```
Open Grafana on `http://localhost:3001` and import the dashboards in `/observability/grafana/dashboards`.

---
## 8. Run the full stack
- Ensure `.env` has all keys (OpenRouter, Twilio, etc.).
- Start services with your main compose + overlays.
- `make health` from `/home/yogi/fishmouth/app`.
- Smoke‑test Address Lookup (`POST /api/lookup/address`).

---
## 9. Email deliverability (Domain Connect Wizard in Admin)
- Go to Admin → Messaging → **Domain & Deliverability**.
- Enter your domain; the UI calls **/messaging/domain/verify** to check SPF/DKIM/DMARC.
- If self‑hosting or using generic SMTP, click **Generate DKIM** to produce a selector + TXT value; publish in DNS.
- Optional: provide Cloudflare token and apply DNS records with **/cloudflare/dns/apply**.
- Send a test email using **/messaging/providers/test**.

---
## 10. Billing gateway (optional)
- Copy `/home/yogi/fishmouth/roofing_exec_playbooks_and_admin_ext_v3/billing-gateway` to `/app/services/billing-gw-8032`.
- Set Stripe keys; start the service; link Admin → Billing page later (stub included).

**Done.**
