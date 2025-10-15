# Minimal Change Lists (apply in order)

## Backend (8000)
1. **Add routes (no breaking changes):**
   - `POST /api/analysis/roof` → store `RoofAnalysis`.
   - `POST /api/quality/decision` → store `QualityDecision`.
   - `POST /api/reports/owner` → store report metadata and file URI.
2. **Env vars:** add `AI_GATEWAY_URL`, `VISION_AI_URL`, `MAPPING_URL`, `QUALITY_URL`.
3. **DB:** create (`roof_analyses`, `quality_decisions`, `reports`) tables with FKs to `leads`.

## Orchestrator (8001)
1. Add `roof-scan` job that calls 8025→8011→8015/8002→8024→8004→8026→8023→8008.
2. Persist job status and percent complete for the progress bar.

## Frontend (3000)
1. **New components:** Roof panel, Quality badge, Report viewer.
2. **Map overlays:** draw polygons from `/tiles/overlay.geojson`.
3. **Buttons:** “Re‑score”, “Upgrade Quality” (fires 8026 action).
