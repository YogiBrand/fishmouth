# Roofing Market Tile Bundles

This directory stores prebuilt vector overlays that power the local `tileserver_gl`
stack (`app/config/docker-compose.tiles.yml`). Tiles are generated from open
datasets so the platform can showcase premium roofing markets without requiring
third-party map keys.

## Included datasets

| File | Layer | Description |
| --- | --- | --- |
| `roofing_markets.mbtiles` | `roofing_markets` | Vector polygons for high-value neighborhoods (Palm Beach FL, Port Royal/Old Naples FL, Scarsdale/ Bronxville NY). Attributes include hazard and risk scores derived from NOAA Storm Events (2020–2024) and heuristics for replacement cost and roof age. |

## Regeneration workflow

1. Download NOAA Storm Event detail CSVs (once):
   ```bash
   mkdir -p data/raw
   for year in 2020 2021 2022 2023 2024; do
     curl -O https://www.ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/StormEvents_details-ftp_v1.0_d${year}_c2025*.csv.gz
   done
   ```

2. Build the GeoJSON feature collection:
   ```bash
   python3 scripts/ops/build_roofing_market_dataset.py
   ```

3. Convert the GeoJSON into MBTiles (requires the repo virtualenv):
   ```bash
   . .venv/bin/activate
   python scripts/ops/geojson_to_mbtiles.py
   ```

The resulting MBTiles file is mounted into the tileserver container at
`/data/roofing_markets.mbtiles`.

