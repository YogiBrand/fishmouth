# Local Basemap & High-Quality Imagery (Self-Hosted)

This stack gives you **full control**: run a vector basemap, serve your own raster COGs/NAIP, and publish WMS/WMTS/XYZ locally.

## Components
- **TileServer‑GL** (vector basemap): serves MBTiles built by **Planetiler** from OSM extracts.
- **TiTiler** (COG server): serves Cloud‑Optimized GeoTIFFs (e.g., NAIP/USGS) as dynamic tiles and thumbnails.
- **GeoServer** (optional): classic WMS/WMTS/WFS endpoint for GIS workflows.
- **PostGIS** (optional): store your roof polygons and overlays for tiled rendering later.

## Quickstart
1. **Vector basemap (OSM)**
   - Download a regional extract (e.g., from Geofabrik) and build an MBTiles with Planetiler:
     ```bash
     # Example: Texas
     java -Xmx8g -jar planetiler.jar        --download        --area=us/texas        --output=texas.mbtiles
     ```
   - Put `texas.mbtiles` under `tiles/` and start TileServer‑GL (docker compose below).

2. **Raster imagery (NAIP/USGS)**
   - Download NAIP/USGS COGs for AOIs into `imagery/` (COG = Cloud Optimized GeoTIFF).
   - Start **TiTiler**; request tiles like:
     ```
     http://localhost:8081/cog/tiles/{z}/{x}/{y}.png?url=http://host/imagery/naip_tx_2022.tif
     ```

3. **GeoServer (WMS/WMTS, optional)**
   - Mount `imagery/` and `data/` into GeoServer; publish your layers for QGIS or your app via WMS/WMTS.

4. **QGIS integration**
   - Add a WMTS/XYZ for TileServer‑GL vector (rasterized client‑side) and TiTiler endpoints.
   - Load your roof **GeoJSON** outputs and style them; save a `.qgz` project if desired.

See `config/docker-compose.tiles.yml` for a ready overlay.
