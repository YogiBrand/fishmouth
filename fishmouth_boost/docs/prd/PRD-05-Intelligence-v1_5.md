# PRD‑05 · Intelligence v1.5 (Quality, Overlays, Confidence, Score Refresh)

**Goal**: Add `image_quality`, `confidence`, damage overlays PNG, and refresh priority score.

**Data**
- `property_scores.image_quality float`
- `property_scores.confidence float`
- `property_scores.overlays_url text`
- `leads.priority_score float` + `score_version`

**Acceptance**
- Low-quality imagery → lower confidence and optional skip of expensive steps.
- Overlays align visually; toggle in UI.
