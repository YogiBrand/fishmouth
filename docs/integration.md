# Integration Guide — Enrichment (8033) + Onboarding Auto‑Scan (8034)

## 1) Copy files into repo
Unzip this bundle and copy its tree into your repo root **/home/yogi/fishmouth/**, preserving folders:
- `app/services/enrichment-8033/*`
- `app/services/onboarding-8034/*`
- `app/config/docker-compose.enrichment_onboarding.yml`
- `sql/migrations/002_onboarding_starter_leads.sql`
- `app/frontend/src/components/StarterLeadsPanel.jsx`
- `docs/codex_prompts.md`
- `docs/integration.md`

## 2) Env
Add to `.env`:
```
OPENROUTER_API_KEY=sk-or-...
DATABASE_URL=postgresql://user:pass@postgres:5432/app
```

## 3) Migrations
```
psql $DATABASE_URL -f sql/migrations/002_onboarding_starter_leads.sql
```

## 4) Compose
Start services with overlay:
```
docker compose -f app/docker-compose.yml   -f app/config/docker-compose.additions.yml   -f app/config/docker-compose.enrichment_onboarding.yml up -d --build
```
- Enrichment: http://localhost:8033/docs
- Onboarding: http://localhost:8034/docs

## 5) Frontend (StarterLeadsPanel)
- Import the panel and show it on the Dashboard (or a dedicated Onboarding page).
Example (pseudo-diff):
```diff
+ import StarterLeadsPanel from '../components/StarterLeadsPanel'
...
  <DashboardSections>
+   <StarterLeadsPanel apiBase={'http://localhost:8034'} userId={currentUserId} />
  </DashboardSections>
```

## 6) Workflow — New user signup
When a user signs up, call:
```
POST http://localhost:8034/onboarding/seed
{
  "user_id": "<uuid>",
  "lat": <from browser geolocation or IP geocode>,
  "lon": <...>,
  "radius_m": 5000,
  "sample": 1000
}
```
Then the UI calls:
```
GET http://localhost:8034/onboarding/leads/<user_id>
```
to render HOT(10) + WARM(15) + LOCKED(rest).
Redeem with:
```
POST http://localhost:8034/onboarding/redeem
{ "user_id":"<uuid>", "lead_id": <id>, "cost_credits": 10 }
```

## 7) Enrichment service usage (8033)
- Property details:
```
POST http://localhost:8033/property/details { "address":"123 Main St Anytown, ST" }
```
- Contact by address:
```
POST http://localhost:8033/contact/lookup/address { "street":"123 Main St","city":"Austin","state":"TX" }
```
- AI research (OpenRouter Perplexity):
```
POST http://localhost:8033/research/query { "question":"Find email for ...", "use_openrouter":true }
```

## Notes
- TruePeopleSearch and Zillow may block scrapers at volume; use moderation & proxies if scaling.
- To enable Playwright fallback for /research/query, install playwright in the 8033 container and run `playwright install chromium`.
