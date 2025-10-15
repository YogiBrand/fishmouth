# PRD‑24 · Cost Governance

- Budget keys: `imagery`, `property_data`, `enrichment`, `communications`, `ai`.
- Per-lead and per-day caps; refuse expensive upgrades if user over budget.
- All external calls wrapped with: cache → budget → call → cost log → events.
