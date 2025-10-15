# Mapping Integration: Self‑Hosted Basemap + Analytics

- Use TileServer‑GL (vector) + TiTiler (raster COG) as in v2 tiles overlay.
- Admin UI includes a **Map Analytics** card that renders:
  - Lead clusters (GeoJSON) from Lead‑Gen
  - Storm impact polygons from Event Monitor
  - Coverage heat (tiles by `RoofAnalysis.score`)
- GeoCompute 8029 can compute zonal stats (mean score per census tract) and return choropleths.
- Stream map interactions via WebSocket for live dashboard updates (selection → data table).

**Performance**
- Pre‑generate MBTiles for big regions with Planetiler.
- Keep COGs tiled via TiTiler; adopt on‑disk cache for hot tiles.
- Use CDN only if you expose maps publicly; for local ops, reverse proxy + HTTP/2 pushes suffice.
