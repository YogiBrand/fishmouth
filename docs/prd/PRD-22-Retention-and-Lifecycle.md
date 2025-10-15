# PRD‑22 · Retention & Lifecycle

- Assets: tiles/overlays TTL 30d; thumbnails keep; reports keep.
- Events retained 365d (roll-up to daily funnel table after 90d).
- Periodic Celery `expire_assets` task trims metadata and removes local or deletes S3 keys if TTL passed.
