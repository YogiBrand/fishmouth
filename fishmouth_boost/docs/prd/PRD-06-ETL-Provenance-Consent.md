# PRD‑06 · ETL Reliability, Provenance, Consent/DNC

**Goal**: Rock-solid scraping & enrichment with caching, dedupe, per-field provenance, and consent enforcement.

**Data**
- `leads.dedupe_key char(64) unique`
- `leads.provenance jsonb`
- `leads.consent_email/sms/voice boolean`, `leads.dnc boolean`
- `etl_jobs`, `etl_errors`

**Acceptance**
- Duplicate leads merged by dedupe_key.
- Sends blocked when consent missing or DNC=true.
- ETL retries/backoff visible in logs and metrics.
