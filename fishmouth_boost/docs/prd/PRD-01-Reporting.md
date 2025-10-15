# PRD‑01 · Reporting: Server‑Side PDF, Public Share Links, Thumbnails

**Goal:** Deterministic PDFs with previews and public share tokens + `report.viewed` analytics.

## Scope
- Playwright (or WeasyPrint) renderer worker.
- `/r/:token` public viewer (read-only).
- Thumbnails (1200x630) for dashboard cards + OG.
- Content checksum → immutable snapshot.

## API
- `POST /api/v1/reports/:id/render` -> `{ pdf_url, preview_url, checksum }`
- `POST /api/v1/reports/:id/share` -> `{ share_url, token_id }`
- `DELETE /api/v1/shares/:token_id`
- `GET /r/:token` -> logs `report.viewed`.

## Data
- `reports`: `pdf_url`, `preview_url`, `content_checksum`, `rendered_at`
- `public_shares`: `token`, `expires_at`, `revoked`

## Acceptance
- Identical render for identical inputs; expired tokens 404; views logged as events.
