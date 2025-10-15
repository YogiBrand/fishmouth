# Fish Mouth — Data Architecture & Geospatial Pack (Full)
Created: 2025-10-14

This pack adds **database migrations (PostGIS)**, **imagery storage & TTL services**, **scan/polygon workflow**,
**map APIs & frontend MapLibre components**, **lead scoring 2.0**, and **PRDs** that complete the production setup.

**Where to copy:**
- `/db/migrations/*.sql` → your migrations directory (or run via psql)
- `/backend/**` → merge into your backend app (mount routers)
- `/frontend/**` → merge into your React app
- `/docs/prd/*.md` → project docs (aligns with earlier Boost Pack)

See `INSTALL.md` for step-by-step.
