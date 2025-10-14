# ✅ Playbook 2 – Lead Pipeline Hardening (Complete)

## Resilience & Provider Reliability
- Circuit breaker + rate limiting toolkit at `backend/services/resilience.py` with centralized knobs in `Settings.pipeline_resilience`.
- All external wrappers (imagery, discovery, property, contact) now use retries, throttling, circuit breakers, and expose the originating source (`mapbox`, `remote`, `synthetic`, etc.).
- Lead scans push live progress over a WebSocket (`/ws/scans/{scan_id}`) in addition to the polling endpoint, powered by the in-memory progress notifier.

## Data Quality & Storage Guarantees
- Leads capture per-stage provenance: `discovery_status`, `imagery_status`, `property_enrichment_status`, `contact_enrichment_status`.
- Automatic schema guard in `backend/database.py` adds the new columns when the app boots (covers environments where the Alembic directory is read-only — plan to migrate these DDL statements into an Alembic revision once permissions allow).
- Scan summaries now bundle source/failure counters so operators can see fallbacks instantly.

## Frontend Visibility
- `LeadList.jsx` and `LeadDetailPage.jsx` surface data quality badges so operators know when records came from live providers vs mock/synthetic fallbacks.
- Table/list views render the same provenance badges for quick triage.

## Tests & Tooling
- Added async provider regression tests (`backend/tests/test_provider_resilience.py`) ensuring mock generators stay deterministic and enriched profiles remain populated.
- Requirements updated with pytest + asyncio support; `python3 -m pytest backend/tests` validates the mocks.

## Next Up (Playbook 3 Preview)
- Shift sequence execution to background jobs (Celery) with granular scheduling.
- Implement delivery adapters (SendGrid/Postmark, Telnyx SMS/Voice) with mock/live toggles.
- Build branching logic + manual overrides in the sequence engine, and expose the timeline UI on the lead detail page.
