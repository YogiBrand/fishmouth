# Lead‑Gen (8008)
**Role:** Produces a `Lead` with price, score, outreach assets.

- Accepts `QualityDecision` and `RoofAnalysis` events.
- Computes price via dynamic rules; writes to `leads` table and notifies frontend.
