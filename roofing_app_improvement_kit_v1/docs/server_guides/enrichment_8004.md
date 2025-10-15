# Enrichment (8004)
**Role:** Joins scraped data with Census/USGS/USPS-normalized attributes.

- Implement idempotent upserts keyed by `{jurisdiction, permit_id}`.
- Derive roof age from year‑built + roof‑type heuristics; surface confidence scores.
