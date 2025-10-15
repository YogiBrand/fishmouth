# Admin & Observability Add‑On for Roofing Platform
**Date:** 2025-10-15

This kit adds a **production‑ready Admin Portal**, **Telemetry & Billing**, and an optional **GeoCompute** service to your platform. It matches your app's visual style (vertical nav; clean cards) and tracks **users, usage, costs, revenue, quality, and service health**.

## What’s included
- `admin-api/` — FastAPI service (port 8031) exposing Admin REST + WebSocket for live metrics.
- `admin-ui/` — React (Vite) admin dashboard skeleton with pages, routing, and theme tokens.
- `telemetry-gw/` — Tiny HTTP event sink (port 8030) to record usage events & costs to Postgres.
- `geocompute-8029/` — Raster & vector analytics (slope, aspect, zonal stats, tile algebra) with Rasterio.
- `observability/` — Prometheus, Grafana, Loki, exporters, and curated Grafana dashboards (JSON).
- `sql/` — Migrations for analytics/billing tables; materialized views for daily KPIs.
- `docs/` — Full setup, performance notes, and integration steps for self‑hosted mapping + admin.

Merge this kit with your v2 bundle for a complete, production‑ready stack.
