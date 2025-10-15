# PRD‑20 · Lead Scoring 2.0

**Signals & weights** (start; learn later):
- Roof age (0–15) — 15
- Imagery CV (damage, staining, missing shingles) — 25
- Image quality (resolution/clarity/visibility) — 10
- Property value percentile (market) — 10
- Recent permits (roof/other) — 10
- Contagion (nearby roof activity last 180d) — 10
- Contact quality (verified phone/email) — 10
- Storm proximity (optional) — 10

**Scoring = weighted sum**, normalized to 100; classify to {cold,warm,hot}.
