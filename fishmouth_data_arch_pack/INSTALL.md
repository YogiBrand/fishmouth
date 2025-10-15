# Install & Wire-up

## 1) Database
1. Ensure Postgres has PostGIS:
   - `CREATE EXTENSION postgis;`
   - Or run `/db/migrations/20251014_enable_postgis.sql`.

2. Apply migrations in order:
   - 20251014_enable_postgis.sql
   - 20251014_core_entities.sql
   - 20251014_imagery_assets.sql
   - 20251014_scans.sql
   - 20251014_events_partitions.sql (optional)
   - 20251014_materialized_views.sql
   - 20251014_map_views.sql

## 2) Backend
- Copy `/backend/modules/**` into your backend project (e.g., `app/modules`).
- Mount routers from `/backend/api/v1/*.py`:
  ```python
  from app.api.v1.maps import router as maps_router
  from app.api.v1.scans import router as scans_router
  from app.api.v1.assets import router as assets_router
  app.include_router(maps_router)
  app.include_router(scans_router)
  app.include_router(assets_router)
  ```
- Add Celery tasks from `/backend/celery/tasks/*.py` to your worker.

## 3) Storage
- Choose Local or S3/R2 driver in `app/modules/storage`.
- Set env:
  - `LOCAL_STORAGE_ENABLED=true` (dev) OR S3/R2 credentials in prod.
- Configure lifecycle on bucket (expire `/tiles/*` and `/overlays/*` after 30 days).

## 4) Frontend
- Copy `/frontend/src/**` into your app.
- Install deps:
  - `npm i maplibre-gl @mapbox/mapbox-gl-draw supercluster`
- Use pages/components:
  - `/pages/ScanPage.jsx`
  - `/components/Map/LeadMap.jsx`
  - `/components/Scanner/DrawTool.jsx`

## 5) Test
- Use Postman collection in `/postman/` to smoke endpoints.
- Open Scan page, draw a polygon, run a scan, watch progress, and see new leads on the map.
