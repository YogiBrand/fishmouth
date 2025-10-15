# PRD‑11 · Roof Scanner & Wizard

**Providers (order & policy)**: Free (NAIP/OpenAerialMap) → Mapbox Satellite → Google Static (last resort). Cache tiles (7d TTL); quality gates; budget caps.

**Wizard UX**
- Choose area: ZIP/City/County search or draw polygon.
- Provider & budget: show estimated cost & allow caps.
- Filters: roof age threshold, min property value, building type, include permits.
- Contacts: enrichment & verification toggles.
- Run & Review: progress, ETA, results list with reasons & confidence.

**Back-end**: `scan_jobs` table, events for progress, PostGIS recommended for polygons.
