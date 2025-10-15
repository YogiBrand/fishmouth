# PRD‑01 · Reporting Foundation: Server‑side PDF, Public Share Links, Thumbnails

**Problem**: Client-side export is inconsistent; no public share or thumbnails; "send" stubs lack deterministic output.

**Goal**: Deterministic server-rendered PDFs + preview thumbnails + public view tokens + view analytics.

**Scope**
- Playwright or WeasyPrint rendering (worker with queue).
- Immutable snapshot via `content_checksum`. Store `{pdf_url, preview_url, share_token_id, rendered_at}`.
- Public viewer `/r/:token` (read-only) that logs `report.viewed` event.
- Thumbnails 1200×630 PNG for dashboard & OG preview.

**API**
- `POST /api/v1/reports/{id}/render` → `{pdf_url, preview_url, checksum}`
- `POST /api/v1/reports/{id}/share` → `{share_url, token_id, expires_at}`
- `DELETE /api/v1/shares/{token_id}`
- `GET /r/{token}` (public viewer; emits `report.viewed`)

**Data Model**
Add to `reports`:
- `pdf_url text`, `preview_url text`, `content_checksum char(64)`, `rendered_at timestamptz`, `share_token_id uuid null`

`public_shares`:
- `id uuid pk`, `report_id uuid fk`, `token char(32) unique`, `expires_at timestamptz null`, `revoked boolean default false`, `created_at timestamptz default now()`

**Acceptance**
- Re-render is skipped if checksum unchanged unless `force=true`.
- Public link opens w/o auth; expired/revoked tokens 404.
- `report.rendered` and `report.viewed` events recorded.
