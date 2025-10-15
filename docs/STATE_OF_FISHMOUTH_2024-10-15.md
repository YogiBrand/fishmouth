# FishMouth Platform Snapshot — 15 Oct 2024

Snapshot captured from branch `main` at commit `061bc5037487f06170bb2ac94ae119bb6e2284c1`. This document summarises the current repository layout, runtimes, working capabilities, and open follow-up items after publishing the latest state to GitHub.

## Repository Map
- `backend/` FastAPI application, Celery workers, and core orchestration logic for leads, reports, voice, and billing.
- `frontend/` React SPA with the redesigned dashboard, enhanced reports flow, and expanded business settings fabrics.
- `services/` Operational microservices (enrichment, image pipeline, orchestrator, ML inference, scraper, etc.).
- `app/` **New** modular platform stack (ports 8022–8032) with domain services, telemetry gateway, admin API/UI, observability bundle, SQL migrations, prompts, and local tiles.
- `roofing_admin_kit_v1/`, `roofing_app_improvement_kit_v1/`, `roofing_app_improvement_kit_v2/`, `roofing_exec_playbooks_and_admin_ext_v3/` packaged extension kits containing code starters, docs, and prompts for downstream deployments.
- `docs/` and numerous root-level playbooks/specs updated to align with the new stack.

## Runtime Surfaces

### Core Platform (`docker-compose.yml`)
| Service | Port(s) | Purpose |
| --- | --- | --- |
| `backend` | 8000 | Main FastAPI API with Prometheus + OTLP instrumentation. |
| `voice_server` | 8001 | Telnyx voice streaming + AI call handler. |
| `enrichment-service`, `scraper-service`, `lead-generator`, `image-processor`, `ml-inference`, `street-imagery`, `geocoder-service`, `orchestrator` | 8002–8015 | Data ingestion, AI enrichment, geospatial processing, orchestration, and lead automation. |
| `postgres`, `redis` | 5432, 6379 | Primary data stores for monolith services. |
| `frontend` | 3000 | React dashboard served via Vite dev server. |

### Modular Stack (`app/` overlays)
- Base compose (`app/docker-compose.yml`): `postgres` (55432), `redis` (56379), `telemetry_gw_8030`, `admin_api_8031`, `billing_gw_8032`.
- Service overlay (`app/config/docker-compose.additions.yml`): address lookup 8022, AI gateway 8023, vision AI 8024, mapping intel 8025, quality engine 8026, OSINT contacts 8027, event monitor 8028.
- Tiles & imagery overlay (`app/config/docker-compose.tiles.yml`): Tileserver-GL (8080), TiTiler (8081), GeoServer (8082), PostGIS (5433) mounting local tile/imagery datasets. Bundled `app/tiles/roofing_markets.mbtiles` serves high-value coastal + northeastern neighborhoods with hazard scores. Satellite sources are defined via `REACT_APP_SATELLITE_TILE_TEMPLATE` (see `docs/IMAGERY_SETUP.md`).
- Observability overlay (`app/observability`): Prometheus, Grafana dashboards (`platform_overview.json`), and scrape config tuned to the telemetry gateway.
- Admin UI (`app/admin-ui`): Vite build targeting `VITE_ADMIN_API`, includes Overview, Usage, Messaging, Queues, Health, Costs, and Users pages.
- Database snapshot (`app/pgdata`) bundled for analytics schema state; complements SQL migration `app/sql/migrations/001_analytics_schema.sql`.

### Telemetry and Logging
- `shared/observability` exports tracing helpers; backend bootstraps Sentry and OTEL exporters (`backend/main.py`).
- Usage/cost events flow through `app/services/*` middleware into telemetry gateway (`app/services/telemetry-8030/app/main.py`).
- Grafana dashboards track KPIs, usage, and service health out-of-the-box.

## Backend Feature Highlights
- **Manual SmartScan pipeline** (`backend/services/lead_generation_service.py`): new `generate_manual_lead` path geocodes single addresses, runs `EnhancedRoofAnalysisPipeline`, injects manual activity records, and respects optional street-view toggles.
- **Enhanced Reports API** (`backend/app/api/v1/reports.py`, `backend/app/api/v1/enhanced_reports.py`): JSON list/detail/update endpoints, share links, and AI content generation with OpenRouter integration, prompt fingerprint caching, token/time metrics, and persistence to `ai_generations`.
- **Report content generator** (`backend/app/services/report_content_generator.py`): Async OpenRouter client with fallback templates, structured metadata, and deterministic prompt signature helper.
- **Pricing suggestions** (`backend/app/services/pricing_suggester.py`): Baseline heuristics by service/state enabling frontend pricing summaries.
- **Contractor enrichments** (`backend/database.py`): auto-adds JSON columns for services config, pricing suggestions, autofill status, and analytics usage.
- **Migrations** (`backend/migrations/006_enhanced_reports_system.sql`): Creates full enhanced reports schema (reports, section templates, interactions, shares, deliveries, AI generations) with triggers and indexes.

## Frontend Feature Highlights
- **Dashboard rebuild** (`frontend/src/pages/Dashboard.jsx`): multi-panel layout with quests, wallet rewards, Manual SmartScan wizard, Enhanced Lead detail, KPI row, map overlays, and modular modals.
- **Manual Address Wizard** (`frontend/src/components/ManualAddressWizard.jsx`): 3-step guided form with deliverable toggles, tiered content, tagging, and in-app toast feedback wired to `/api/leads/manual`.
- **Enhanced Reports page** (`frontend/src/pages/EnhancedReportsPage.jsx`): lead picker, business profile completeness callouts, recent reports list, and generator surface.
- **EnhancedReportGenerator** and `ReportPage.jsx`: expose section-level AI drafting, local caching, PDF export, and share link flows.
- **Comprehensive Business Settings** (`frontend/src/components/ComprehensiveBusinessSettings.jsx` + `frontend/src/services/businessProfileService.js`): deep local persistence, pricing calculators, service categorisation, AI knowledge base, autofill apply/reject flows, and image quality validation.
- **API service upgrades** (`frontend/src/services/api.js`): manual lead endpoint with mock fallback, expanded wallet integrations and analytics fetches.

## Admin + Extensions
- **Admin API/UI bundle** (`app/services/admin-api-8031`, `app/admin-ui`): exposes KPIs, users, refunds, messaging domain checks, DNS automation, and job queue proxies; UI mirrors FishMouth styling with ready-made pages.
- **Telemetry Gateway** (`app/services/telemetry-8030`): fast ingest for usage/cost events into analytics schema.
- **Billing gateway stub** (`app/services/billing-gw-8032`): placeholder for Stripe integration with telemetry hooks.
- **Extension kits (`roofing_*`)**: each kit contains Dockerfiles, service templates, observability overlays, prompts, and scenario guides for onboarding partners or variants (v1 improvement kit, v2 upgrade, executive playbooks + admin extensions).

## Working Feature Checklist
- Manual address ingestion → enhanced pipeline → lead creation + activity logging.
- Enhanced report drafting with AI fallback, prompt caching, PDF generation, and share routing.
- Dashboard questing, rewards ledger, wallet management, and level progression logic.
- Business settings autopfill diff viewer with apply/discard workflow.
- Telemetry instrumentation across new mini-services; Grafana dashboards render with provided scrape targets.
- Admin portal pages backed by FastAPI routes, including messaging domain verification and Cloudflare automation stubs.
- Docker compose overlays validated locally (Postgres snapshot + migrations align with new schemas).

## Known Gaps & Follow-Ups
- `app/services/address-8022`, `app/services/admin-api-8031`, `app/services/billing-gw-8032` contain stubbed integrations (real downstream endpoints, auth, and provider SDK wiring still required).
- OpenRouter usage requires `OPENROUTER_API_KEY`; otherwise report content falls back to templates (`backend/app/services/report_content_generator.py`).
- Pricing suggester currently heuristic-only; hook into real market research or scraper data (`backend/app/services/pricing_suggester.py`).
- Business settings autofill backend endpoints (`/api/business/settings/*`) remain TODO on server side; frontend uses optimistic mocks.
- `app/pgdata` is a live Postgres data directory; rotate credentials or rebuild from migrations before production deployment.
- Node dependencies for `app/admin-ui` are vendored via `package-lock.json`, but no build script is wired into main compose yet.
- Ensure secrets/keys (.env) are populated before bringing up AI, SMS, email, and billing integrations.

## Operating Notes
- Core stack: `docker-compose up backend frontend orchestrator ...` (see root compose for full service list).
- Modular stack: `cd app && docker compose -f docker-compose.yml -f config/docker-compose.additions.yml up --build`.
- Tiles overlay: append `-f config/docker-compose.tiles.yml` when local MBTiles/TIff assets are needed. Vector overlays originate from `data/geojson/roofing_markets.geojson` via `scripts/ops/build_roofing_market_dataset.py` + `scripts/ops/geojson_to_mbtiles.py`. Satellite imagery can be streamed or downloaded following `docs/IMAGERY_SETUP.md`.
- Observability: `docker compose -f docker-compose.yml -f observability/docker-compose.observability.yml up prometheus grafana`.
- Admin UI dev: `cd app/admin-ui && npm install && npm run dev -- --port 4173` with `VITE_ADMIN_API=http://localhost:8031`.

## Reference Assets
- Prompts under `app/prompts/` for damage descriptions, outreach, property reports, storm risk.
- Aerial imagery samples (`aerial imager 1.png`, `app/imagery/`) align with the tiles overlay; NOAA storm catalogs (2020–2024) in `data/raw/` feed the hazard scoring used in the vector tiles.
- Comprehensive specs retained in `FISHMOUTH_COMPLETE_TECHNICAL_SPECIFICATION.md`, `FISHMOUTH_MASTER_SPEC.md`, and related strategy docs.
