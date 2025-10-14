# Enhanced Roof Intelligence Pipeline

This document captures the new autonomous roof intelligence workflow that now powers lead generation.

## Overview
1. **Satellite Imagery Harvest** – `ImageryAutopilot` queries Mapbox + Google Static tiles across zoom levels, scores each tile (resolution, brightness, contrast, sharpness, cloud cover, roof visibility) and stores the sharpest asset under `uploads/aerial/{dossier_id}/satellite/`.
2. **Roof Normalisation** – `RoofSegmentationService` performs heuristic segmentation/PCA alignment to produce a 768×768 top-down crop plus binary mask.
3. **Surface Anomalies** – `RoofAnomalyDetector` emits color-coded heatmaps (discoloration, streaking, moss, granule loss) & per-issue masks with severity/probability scores.
4. **Street View Capture** – `StreetViewCollector` loops Google Street View headings (45° increments), validates pano distance (<45m), scores occlusion, and saves the best 0–3 angles with curbside anomaly hints.
5. **Dossier Assembly** – `EnhancedRoofAnalysisPipeline.analyze_roof_with_quality_control` orchestrates every step, persists assets, and returns a structured dossier for downstream systems.

All assets and JSON live beneath a deterministic dossier slug: `uploads/aerial/dossier-{sha1...}/satellite|streetview/...`.

## Data Model Additions
* `leads.image_quality_score` / `leads.image_quality_issues`
* `leads.quality_validation_status` (`passed|review|failed`)
* `leads.roof_intelligence`: full pipeline dossier (satellite, mask, heatmap, anomalies, street view summary).
* `leads.street_view_quality`: averages + captured headings for curbside imagery.

Alembic migration: `backend/app/migrations/004_enhanced_roof_intelligence.py`.

## Configuration & Credentials
* `MAPBOX_TOKEN` (optional but recommended).
* `GOOGLE_MAPS_API_KEY` **required** for Street View capture. When absent, the collector gracefully skips street views.
* Storage writes obey `config.Settings.storage.storage_root`; nested directories are created automatically.

## Quality Guardrails
* Imagery is tagged `quality_validation_status`:
  * `<45` score ⇒ `failed`
  * `<55` or critical issues (`cloud_cover`, `heavy_shadows`, `poor_roof_visibility`) ⇒ `review`
  * Otherwise ⇒ `passed`
* Street View averages (occlusion, quality) surface in `leads.street_view_quality` for monitoring and cost controls.

## Integration Points
* `LeadGenerationService` now calls `EnhancedRoofAnalysisPipeline`, merges dossier data into `Lead.ai_analysis["enhanced_roof_intelligence"]`, and bumps acquisition cost to account for Street View API usage.
* Activity stream metadata logs imagery source, quality score, heatmap URL, and headings captured for auditability.
* API responses (`/api/leads`, `/api/leads/{id}`) now expose `image_quality_score`, `quality_validation_status`, `street_view_quality`, and the full `roof_intelligence` dossier, enabling the dashboard and lead detail view to render overlays, quality badges, and Street View evidence.
* New `POST /api/scan/estimate` endpoint returns cost and volume estimates before a scan launches, enabling the frontend to warn customers about large radius selections.

## Validation Checklist
1. Ensure `MAPBOX_TOKEN` / `GOOGLE_MAPS_API_KEY` present in `.env`.
2. Run database migrations (Alembic or app migrations) to apply new lead columns.
3. Execute a scan with `use_mock_imagery=False` to confirm:
   * Satellite tile saved under `uploads/aerial/...`.
   * `Lead.image_quality_score` populated; status `passed|review|failed`.
   * `Lead.roof_intelligence["heatmap"]["url"]` and Street View list populated (when API key present).
4. Inspect `Lead.ai_analysis["enhanced_roof_intelligence"]` to verify dossier JSON matches expectations.
