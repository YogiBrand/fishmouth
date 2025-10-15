# End‑to‑End Workflows

## Roof Scan (address → report)

**Goal:** From a user address to a scored roof report and prioritized lead.

**Steps**  
1. **Geocoding** (8025 Mapping Intel)  
   - Input: `address`  
   - Output: `{ lat, lon, normalized_address }`  
   - Fallbacks: Nominatim (1 r/s), cached results, optional Pelias self‑host.

2. **Imagery acquisition** (8011 Scraper + 8025 Mapping)  
   - Sources: NAIP/USGS (WMS/WMTS), Mapillary for street‑level (if available).  
   - Output: raw tiles, stitched orthoimage, provenance manifest.

3. **Enhancement** (8015 Super‑HD or 8002 Image)  
   - ESRGAN‑lite 2–4× upscale; JPEG‑XL/WEBP loss‑limited export.  
   - Output: `{ uri, gsd_estimate, checksum }`

4. **Computer Vision** (8024 Vision AI)  
   - Models: YOLOv8n roof/damage, MobileNet‑SSD features, PaddleOCR for text.  
   - Output: `RoofAnalysis` with polygons, classes, confidences, score.

5. **Property and permit enrichment** (8004 Enrichment)  
   - Sources: permit portals (Socrata/ArcGIS Hub), Census ACS/BPS, assessor.  
   - Output: `PropertyEnrichment` with normalized fields + confidences.

6. **Quality Intelligence** (8026 Quality Engine)  
   - Computes composite **lead score**, **data quality**, and **tier decision**.  
   - Output: `QualityDecision` (tier, reasons, suggested upgrades).

7. **NLP narrative** (8023 AI Gateway)  
   - Generates **owner‑facing report** + **contractor outreach draft**.  
   - Uses OpenRouter `:free` models with budget/rate guards.

8. **Lead‑Gen packaging** (8008 Lead‑Gen)  
   - Creates a `Lead` entity with pricing, timing cues, and contact targets.

9. **Dashboard sink** (8000 Backend → Frontend)  
   - Pushes artifacts to dashboard cards: imagery, overlays, scores, reports.

### Event Contracts (selected)
- `RoofAnalysis.v1`  
```json
{"id":"ra_...","address_id":"addr_...","image_uri":"...","polygons":[{"type":"roof","coords":[[lat,lon],...] }],"damage":[{"class":"missing_shingles","confidence":0.82}],"score":74}
```
- `QualityDecision.v1`  
```json
{"id":"qd_...","address_id":"addr_...","lead_score":86,"data_quality":0.71,"tier":"regular","upgrade_reasons":["low_permit_coverage"],"suggested_actions":["enable_premium_imagery"]}
```

## Storm Trigger
- 8028 polls NOAA/NWS and NCEI; computes affected AOIs; re‑scans AOIs with steps 2–6; flags **urgent** leads.

## Data Routing to Dashboard
A mapping table is included at `docs/mapping_table.md` to connect each payload → dashboard widget + API route.
