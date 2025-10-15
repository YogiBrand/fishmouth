# Ops Runbook (Local Production)

## Bring-up
1. `docker compose -f docker-compose.yml -f config/docker-compose.additions.yml -f config/docker-compose.tiles.yml up -d`
2. `make health` (or run `scripts/ops/healthcheck.sh`).

## Health checks (ports)
- 3000 Frontend
- 8000 Backend
- 8001 Orchestrator
- 8002 Image
- 8003 ML Inference
- 8004 Enrichment
- 8008 Lead‑Gen
- 8011 Scraper
- 8015 Super‑HD / Geocoder
- 8023 AI Gateway
- 8024 Vision AI
- 8025 Mapping Intel
- 8026 Quality Engine
- 8027 OSINT Contacts
- 8028 Event Monitor
- 8080 TileServer‑GL
- 8081 TiTiler
- 8082 GeoServer

## Troubleshooting
- **Nominatim 429/403**: enforce 1 r/s, set a proper `User-Agent` & `From` email; enable Redis cache layer.
- **OpenRouter 429**: AI Gateway queues; set `OPENROUTER_API_KEY`; consider adding credits to raise limits.
- **CORS**: backend should proxy calls to 8023–8028; or set CORS origins in each service.
- **Disk**: imagery cache can grow → set lifecycle rules (30–60 days).

## Observability
- Add Prometheus exporters to each FastAPI service (e.g., `/metrics` via `prometheus-fastapi-instrumentator`).
- Use Docker logging driver + Loki, or ELK. Start with text logs + structured JSON in critical services.
