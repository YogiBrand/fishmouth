# PRD‑18 · Imagery Storage, TTL & Presigned URLs

- `assets` table holds metadata; URLs are **presigned** at request time.
- **Thumbnails** (JPG 80) for lists/cards.
- **Overlays** (PNG) expire after 30 days; lifecycle on bucket.
- Reports: `/reports/{report_id}/{checksum}.pdf` (immutable). Preview PNG generated alongside.
- When a **report is opened**, on-demand fetch upgrades imagery quality if thresholds allow.
