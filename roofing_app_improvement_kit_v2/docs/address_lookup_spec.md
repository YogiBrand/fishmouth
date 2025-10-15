# Address Lookup (WOW demo) — Spec

**Goal:** A single address query triggers the full mini‑pipeline and returns progressive results in seconds.

## API (Backend 8000)
- `POST /api/lookup/address`
  Input: `{ "address": "...", "include_imagery": true, "include_permits": true }`
  Output (immediate): `{ "job_id": "...", "normalized_address": "...", "status": "queued" }`

- `GET /api/lookup/{job_id}`
  Output (progressive):
  ```json
  {
    "status": "running|done|error",
    "geocode": { "lat": ..., "lon": ..., "source": "nominatim" },
    "imagery": { "thumbnail": "uri", "quality": 0.82 },
    "analysis": { "score": 74, "damage": [{"class":"missing_shingles","conf":0.81}] },
    "enrichment": { "owner": "...", "email": "...", "confidence": 0.67 },
    "quality": { "data_quality": 0.71, "tier": "regular" },
    "lead": { "id": "...", "overall_score": 86 }
  }
  ```

## Flow
1. Normalize & cache via **Mapping 8025 /geocode** (1 r/s guard).
2. Fire async tasks for imagery (TiTiler thumbnail), CV (8024), permits (8011), enrichment (8004).
3. Update a **Redis hash** per job for progressive polling; complete within ~10–20s free‑tier.
4. Add a **"Create Report"** CTA once `analysis` arrives (call 8023 for narrative).

## Frontend UX
- One search box with suggestion (Nominatim/Photon); debounce 300ms; show recent searches.
- Progressive cards: Geocode → Imagery → Analysis → Owner → Quality → CTA buttons (Report, Email, Call).
