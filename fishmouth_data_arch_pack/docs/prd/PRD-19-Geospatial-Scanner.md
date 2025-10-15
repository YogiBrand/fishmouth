# PRD‑19 · Geospatial Scanner & Polygon Workflows

- Users select ZIP/City/County **or draw polygon**.
- Backend converts GeoJSON → PostGIS polygon, computes tile cover at Z18, caps tiles.
- For each tile: fetch imagery (cache-first), quick CV to find candidate roofs, enqueue enrichment → property → lead.
- Progress in `scan_jobs.stats`: tiles_total, tiles_done, leads_found, cost.
