#!/usr/bin/env python3
"""Convert GeoJSON features into vector MBTiles without external tooling.

This script targets the roofing market dataset produced by build_roofing_market_dataset.py.
It generates `app/tiles/roofing_markets.mbtiles` covering zoom levels 12-16.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Dict, Iterable, Tuple

import mercantile
from mapbox_vector_tile import encode
from shapely.geometry import shape, mapping, box
from shapely.ops import transform

GEOJSON_PATH = Path("data/geojson/roofing_markets.geojson")
MBTILES_PATH = Path("app/tiles/roofing_markets.mbtiles")
LAYER_NAME = "roofing_markets"
ZOOM_MIN = 12
ZOOM_MAX = 16
EXTENT = 4096


def load_features(path: Path) -> Iterable[Dict]:
    if not path.exists():
        raise SystemExit(f"GeoJSON file not found: {path}")
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    for feat in data.get("features", []):
        geom = shape(feat["geometry"])
        if geom.is_empty:
            continue
        feat["__geom"] = geom
        yield feat


def init_mbtiles(path: Path) -> sqlite3.Connection:
    if path.exists():
        path.unlink()
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.execute("PRAGMA application_id = 0x4d504258")  # 'MPBX'
    cur.execute("PRAGMA user_version = 1")
    cur.execute("CREATE TABLE metadata (name TEXT PRIMARY KEY, value TEXT)")
    cur.execute(
        """
        INSERT INTO metadata (name, value) VALUES
            ('name', ?),
            ('format', 'pbf'),
            ('type', 'overlay'),
            ('version', '1'),
            ('description', 'High-value roofing markets extracted from OSM & NOAA'),
            ('minzoom', ?),
            ('maxzoom', ?),
            ('json', ?)
        """,
        (
            LAYER_NAME,
            str(ZOOM_MIN),
            str(ZOOM_MAX),
            json.dumps(
                {
                    "vector_layers": [
                        {
                            "id": LAYER_NAME,
                            "description": "Premium roofing targets with hazard scores",
                            "minzoom": ZOOM_MIN,
                            "maxzoom": ZOOM_MAX,
                            "fields": {
                                "market": "String",
                                "occupancy": "String",
                                "roof_material": "String",
                                "stories": "Number",
                                "year_built": "Number",
                                "roof_age_est": "Number",
                                "footprint_sqft": "Number",
                                "replacement_cost_usd": "Number",
                                "premium_segment": "Boolean",
                                "hazard_score": "Number",
                                "risk_score": "Number",
                                "hazard_focus": "String",
                            },
                        }
                    ]
                }
            ),
        ),
    )
    cur.execute(
        """
        CREATE TABLE tiles (
            zoom_level INTEGER,
            tile_column INTEGER,
            tile_row INTEGER,
            tile_data BLOB,
            PRIMARY KEY (zoom_level, tile_column, tile_row)
        )
        """
    )
    conn.commit()
    return conn


def geom_to_tile_coords(geom, bounds: mercantile.LngLatBbox):
    # convert lon/lat to tile coordinates (0..EXTENT)
    scale_x = EXTENT / (bounds.east - bounds.west)
    scale_y = EXTENT / (bounds.north - bounds.south)

    def project(x, y, z=None):
        tx = (x - bounds.west) * scale_x
        ty = (bounds.north - y) * scale_y
        return (tx, ty)

    return transform(project, geom)


def encode_tile(features, bounds):
    layer = {
        "name": LAYER_NAME,
        "features": [],
        "extent": EXTENT,
    }
    for feat in features:
        geom = geom_to_tile_coords(feat["__tile_geom"], bounds)
        if geom.is_empty:
            continue
        layer["features"].append(
            {
                "geometry": mapping(geom),
                "properties": feat["properties"],
                "id": None,
            }
        )
    if not layer["features"]:
        return None
    return encode([layer], quantize_bounds=False)


def tile_features(features: Iterable[Dict]):
    tile_index: Dict[Tuple[int, int, int], list] = {}
    for feat in features:
        geom = feat["__geom"]
        minx, miny, maxx, maxy = geom.bounds
        for z in range(ZOOM_MIN, ZOOM_MAX + 1):
            for tile in mercantile.tiles(minx, miny, maxx, maxy, [z]):
                tile_bounds = mercantile.bounds(tile)
                clip_geom = geom.intersection(box(tile_bounds.west, tile_bounds.south, tile_bounds.east, tile_bounds.north))
                if clip_geom.is_empty:
                    continue
                key = (tile.z, tile.x, tile.y)
                feat_copy = {
                    "properties": feat["properties"],
                    "__tile_geom": clip_geom,
                }
                tile_index.setdefault(key, []).append((feat_copy, tile_bounds))
    return tile_index


def main() -> None:
    features = list(load_features(GEOJSON_PATH))
    if not features:
        raise SystemExit("No features loaded; run build_roofing_market_dataset.py first.")
    tile_index = tile_features(features)
    conn = init_mbtiles(MBTILES_PATH)
    cur = conn.cursor()
    inserted = 0
    for (z, x, y), entries in tile_index.items():
        features_for_tile = [feat for feat, _ in entries]
        bounds = entries[0][1]
        # rebuild features list but reuse the same bounds
        payload_entries = []
        for feat, _ in entries:
            payload_entries.append(feat)
        tile_data = encode_tile(payload_entries, bounds)
        if not tile_data:
            continue
        tms_y = (2 ** z - 1) - y
        cur.execute(
            "INSERT OR REPLACE INTO tiles (zoom_level, tile_column, tile_row, tile_data) VALUES (?, ?, ?, ?)",
            (z, x, tms_y, sqlite3.Binary(tile_data)),
        )
        inserted += 1
    conn.commit()
    conn.close()
    print(f"[✓] wrote {inserted} tiles to {MBTILES_PATH}")


if __name__ == "__main__":
    main()
