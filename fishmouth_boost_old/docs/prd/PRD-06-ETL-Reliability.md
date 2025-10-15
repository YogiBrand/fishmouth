# PRD‑06 · ETL Reliability (Scraper/Enrichment/Provenance/Consent)

**Goal:** Reliable ETL with dedupe, provenance, and consent enforcement.

## Data
- leads: `dedupe_key`, `provenance`, `consent_*`, `dnc`
- `etl_jobs`, `etl_errors`

## Acceptance
- Duplicates merge; consent/DNC blocks sends appropriately.
