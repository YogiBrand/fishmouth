# PRD‑12 · Cost Strategy (Day‑1 Reliability)

- Cache-first (tiles, enrichments, verifications) with 7‑day TTL.
- Quality gates: skip expensive steps on poor imagery.
- Circuit breakers and provider budgets.
- Graceful degradation: still deliver leads if overlays skipped.
