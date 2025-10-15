# Satellite Imagery Setup

This guide explains how to serve high-quality aerial/satellite tiles through the local Fishmouth stack so the dashboard map renders without relying on external Mapbox/Esri accounts.

## 1. Bring up the tiles stack

```bash
docker compose -f app/docker-compose.yml \
  -f app/config/docker-compose.tiles.yml \
  up tileserver_gl titiler
```

This launches:

- `tileserver_gl` on **http://localhost:8080**
- `titiler` on **http://localhost:8081**

The tileserver hosts `app/tiles/roofing_markets.mbtiles` (vector overlays). TiTiler can dynamically render Cloud Optimised GeoTIFFs (COGs) from S3/Open Data or from local files in `app/imagery/`.

## 2. Choose your imagery source

### Option A — Stream a public COG (no download)

Pick a scene that covers the market you care about. The example below targets Palm Beach, FL (Sentinel-2, 2023-09-05):

```
https://sentinel-cogs.s3.amazonaws.com/sentinel-s2-l2a-cogs/17/R/KL/2023/9/S2A_17RKL_20230905_0_L2A/TCI.tif
```

You can preview it via TiTiler:

```
http://localhost:8081/cog/tiles/15/8930/12304@1x.png?url=https%3A%2F%2Fsentinel-cogs.s3.amazonaws.com%2Fsentinel-s2-l2a-cogs%2F17%2FR%2FKL%2F2023%2F9%2FS2A_17RKL_20230905_0_L2A%2FTCI.tif
```

> Tip: use `curl` or a browser to validate tiles render before wiring them into the app.

### Option B — Download once, serve locally

1. Download a GeoTIFF (NAIP, Sentinel, commercial, etc.) into `app/imagery/`.
2. Ensure the filename ends with `.tif` or `.tiff`.
3. Restart the tiles stack so TiTiler sees the file.

You can point TiTiler at local files using the `/cog/tiles/...` endpoint with a `file:///data/imagery/...` URL (containers mount `app/imagery` as read-only `/opt/data`).

## 3. Wire imagery into the dashboard

Set `REACT_APP_SATELLITE_TILE_TEMPLATE` (comma-separated list of tile templates). The dashboard prefers this value when Mapbox is disabled.

Example `.env` for **local dev**:

```bash
# map imagery proxied through TiTiler
REACT_APP_SATELLITE_TILE_TEMPLATE=http://localhost:8081/cog/tiles/{z}/{x}/{y}@1x.png?url=https%3A%2F%2Fsentinel-cogs.s3.amazonaws.com%2Fsentinel-s2-l2a-cogs%2F17%2FR%2FKL%2F2023%2F9%2FS2A_17RKL_20230905_0_L2A%2FTCI.tif
```

> Remember to URL-encode the `url=` parameter. `encodeURIComponent` from a dev console is your friend.

Restart the frontend (`npm run dev`) and the `DashboardLeadMap` will automatically switch to the provided tiles.

## 4. Layer the high-value market overlay

Tileserver GL serves the vector overlay at:

```
http://localhost:8080/data/roofing_markets.json         # TileJSON metadata
http://localhost:8080/tiles/roofing_markets/{z}/{x}/{y}.pbf
```

You can add it to custom MapLibre styles or inject it at runtime if you want to visualise hazard/risk polygons on top of the imagery. The current dashboard focuses on lead markers, but the overlay is ready for Codex prompts/tests.

## 5. Regenerate data when needed

```bash
# Recreate GeoJSON and hazard metrics from OSM + NOAA
python3 scripts/ops/build_roofing_market_dataset.py

# Convert GeoJSON to MBTiles for the overlay layer
. .venv/bin/activate
python scripts/ops/geojson_to_mbtiles.py
```

Update `REACT_APP_SATELLITE_TILE_TEMPLATE` if you switch to a different scene or local file.

---

With the stack above, the platform runs 100% on self-hosted imagery and overlays—ideal for Codex validation and production hardening without external API dependencies.
