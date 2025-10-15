# PRD‑02 · Token & Template Engine

**Goal:** Unified resolver for `{{lead.*}}`, `{{company.*}}`, `{{report.*}}`, `{{now}}` across report/email/SMS.

## API
- `GET /api/v1/templates`
- `POST/PUT /api/v1/templates/:id`
- `POST /api/v1/templates/preview`

## Acceptance
- Preview flags unresolved tokens; sends use resolved content.
