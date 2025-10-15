# PRD‑17 · Data Model & Storage Strategy

**Goals**
- Store minimal bytes; keep **high-res imagery on-demand**.
- Use PostGIS for all geo; store **points** (properties) and **polygons** (scans).
- Assets table references a storage key and enables **presigned access**.

**Decisions**
- S3/R2 for production; local FS for dev.
- Overlays & tiles TTL = 30 days via bucket rules; reports kept indefinitely.
- Only **thumbnails** stored permanently; regenerate high-res when needed.
