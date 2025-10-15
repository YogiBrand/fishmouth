#!/usr/bin/env python3
"""Assemble high-value roofing market datasets.

This script gathers:
  * OpenStreetMap building footprints (via Overpass API) for targeted markets
  * NOAA Storm Events statistics for 2020-2023 (hail/wind/hurricane categories)

The output is a consolidated GeoJSON (data/geojson/roofing_markets.geojson) that
feeds tippecanoe to build MBTiles for the local tileserver. Each feature includes
basic heuristics such as estimated replacement cost, roof age proxy, and a
hazard score derived from the NOAA catalog.

Run:
    python3 scripts/ops/build_roofing_market_dataset.py
    docker run --rm -v \"$PWD\":/data mapbox/tippecanoe \
       tippecanoe -o /data/app/tiles/roofing_markets.mbtiles \
       -l roofing_markets -Z12 -z16 -rg -Bg --drop-densest-as-needed \
       /data/data/geojson/roofing_markets.geojson
"""

from __future__ import annotations

import csv
import gzip
import json
import math
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import requests
from requests.adapters import HTTPAdapter, Retry

OVERPASS_URL = "https://overpass-api.de/api/interpreter"


@dataclass
class StormSignals:
    hail: int = 0
    wind: int = 0
    hurricane: int = 0
    flood: int = 0

    @property
    def score(self) -> float:
        return round(
            self.hail * 1.6 + self.wind * 1.2 + self.hurricane * 2.5 + self.flood * 0.9,
            2,
        )


@dataclass
class Market:
    slug: str
    name: str
    county: str
    state_code: str
    state_long: str
    bbox: Tuple[float, float, float, float]  # (south, west, north, east)
    description: str
    hazard_focus: str
    min_year_built: int = 1930
    building_filter: str = '["building"]["building"~"house|residential|detached|apartments"]'
    features: List[Dict] = field(default_factory=list)
    storms: StormSignals = field(default_factory=StormSignals)


MARKETS: List[Market] = [
    Market(
        slug="palm_beach_fl",
        name="Palm Beach Barrier Island",
        county="PALM BEACH",
        state_code="FL",
        state_long="FLORIDA",
        bbox=(26.653, -80.050, 26.748, -80.021),
        description="Oceanfront estates with legacy tile roofs; hurricane + salt exposure.",
        hazard_focus="Hurricane, hail, coastal wind uplift",
        min_year_built=1920,
    ),
    Market(
        slug="naples_fl",
        name="Port Royal & Old Naples",
        county="COLLIER",
        state_code="FL",
        state_long="FLORIDA",
        bbox=(26.076, -81.823, 26.151, -81.740),
        description="Ultra-luxury gulf coastline, high FEMA flood premiums, complex roofs.",
        hazard_focus="Tropical storms, king tide intrusion, salt corrosion",
        min_year_built=1950,
    ),
    Market(
        slug="scarsdale_ny",
        name="Scarsdale & Bronxville",
        county="WESTCHESTER",
        state_code="NY",
        state_long="NEW YORK",
        bbox=(40.917, -73.852, 40.973, -73.760),
        description="Historic slate roofs with freeze/thaw cycles and insurance-driven work.",
        hazard_focus="Ice dams, hail, treefall wind loading",
        min_year_built=1900,
    ),
]


session = requests.Session()
retries = Retry(total=4, backoff_factor=2, status_forcelist=[502, 503, 504, 429])
session.mount("https://", HTTPAdapter(max_retries=retries))


def fetch_overpass(market: Market) -> Dict:
    attempts = 0
    last_error: Optional[Exception] = None
    south, west, north, east = market.bbox
    query = f"""
    [out:json][timeout:180];
    (
      way{market.building_filter}({south},{west},{north},{east});
      relation{market.building_filter}({south},{west},{north},{east});
    );
    out body geom;
    """
    while attempts < 4:
        attempts += 1
        try:
            response = session.post(OVERPASS_URL, data={"data": query}, timeout=180)
            response.raise_for_status()
            return response.json()
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            wait = 5 * attempts
            print(f"    overpass retry {attempts}/4 after {wait}s due to: {exc}")
            import time as _time

            _time.sleep(wait)
    if last_error:
        raise last_error
    raise RuntimeError("Overpass request failed unexpectedly")


def polygon_area_sq_m(coords: List[Tuple[float, float]]) -> float:
    # approximate planar area using spherical Mercator scaling
    if len(coords) < 3:
        return 0.0
    earth_radius = 6378137.0
    area = 0.0
    for i in range(len(coords)):
        lon1, lat1 = coords[i]
        lon2, lat2 = coords[(i + 1) % len(coords)]
        x1 = math.radians(lon1) * earth_radius
        y1 = math.log(math.tan(math.pi / 4 + math.radians(lat1) / 2)) * earth_radius
        x2 = math.radians(lon2) * earth_radius
        y2 = math.log(math.tan(math.pi / 4 + math.radians(lat2) / 2)) * earth_radius
        area += x1 * y2 - x2 * y1
    return abs(area) / 2.0


def derive_feature_properties(market: Market, tags: Dict, area_sq_m: float) -> Dict:
    level_raw = tags.get("building:levels") or tags.get("levels") or 1
    try:
        levels = int(float(level_raw))
    except (TypeError, ValueError):
        levels = 1
    year_built = int(tags.get("start_date") or tags.get("year_built") or market.min_year_built)
    roof_material = tags.get("roof:material") or tags.get("roof:colour") or "unknown"
    occupancy = tags.get("building") or "house"
    footprint_sqft = area_sq_m * 10.7639
    replacement_cost = round(footprint_sqft * (350 if roof_material in ("tile", "slate") else 225))
    roof_age = max(0, 2024 - year_built)
    premium_segment = replacement_cost > 750000
    hazard_modifier = 1.0 + (market.storms.score / 100.0 if market.storms.score else 0.3)
    risk_score = round(min(100.0, 40 + roof_age * 0.25 + hazard_modifier * 20), 2)

    return {
        "market": market.name,
        "market_slug": market.slug,
        "description": market.description,
        "hazard_focus": market.hazard_focus,
        "occupancy": occupancy,
        "roof_material": roof_material,
        "stories": levels,
        "year_built": year_built,
        "roof_age_est": roof_age,
        "footprint_sqft": round(footprint_sqft, 1),
        "replacement_cost_usd": replacement_cost,
        "premium_segment": premium_segment,
        "hazard_score": market.storms.score,
        "risk_score": risk_score,
        "storm_counts": {
            "hail": market.storms.hail,
            "wind": market.storms.wind,
            "hurricane": market.storms.hurricane,
            "flood": market.storms.flood,
        },
        "osm_id": tags.get("@id"),
    }


def extract_features(market: Market, data: Dict) -> None:
    elements = data.get("elements", [])
    for element in elements:
        if element.get("type") not in {"way", "relation"}:
            continue
        tags = element.get("tags") or {}
        geometry = element.get("geometry")
        if not geometry:
            continue
        coords = [(pt["lon"], pt["lat"]) for pt in geometry]
        area_sq_m = polygon_area_sq_m(coords)
        if area_sq_m < 500:  # filter out tiny sheds
            continue
        properties = derive_feature_properties(market, tags, area_sq_m)
        feature = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [coords],
            },
            "properties": properties,
        }
        market.features.append(feature)


def load_storm_catalog(csv_path: Path) -> List[Dict[str, str]]:
    rows: List[Dict[str, str]] = []
    opener = gzip.open if csv_path.suffix == ".gz" else open
    with opener(csv_path, "rt", newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            rows.append(row)
    return rows


def update_storm_stats(markets: Iterable[Market], storm_rows: List[Dict[str, str]]) -> None:
    for row in storm_rows:
        county = row.get("CZ_NAME") or ""
        state = row.get("STATE") or ""
        event_type = (row.get("EVENT_TYPE") or "").lower()
        if not county or not state:
            continue
        county_norm = county.strip().upper()
        state_norm = state.strip().upper()
        for market in markets:
            if state_norm not in (market.state_code, market.state_long):
                continue
            if market.county == county_norm or county_norm.startswith(market.county) or market.county in county_norm:
                if "hail" in event_type:
                    market.storms.hail += 1
                if "thunderstorm wind" in event_type or "high wind" in event_type:
                    market.storms.wind += 1
                if "hurricane" in event_type or "tropical storm" in event_type:
                    market.storms.hurricane += 1
                if "flood" in event_type or "flash flood" in event_type:
                    market.storms.flood += 1


def write_geojson(markets: Iterable[Market], path: Path) -> None:
    features = []
    for market in markets:
        features.extend(market.features)
    collection = {"type": "FeatureCollection", "features": features}
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(collection, fh)
    print(f"[✓] wrote {len(features)} features to {path}")


def write_market_summary(markets: Iterable[Market], path: Path) -> None:
    summary = []
    for market in markets:
        summary.append(
            {
                "slug": market.slug,
                "name": market.name,
                "description": market.description,
                "hazard_focus": market.hazard_focus,
                "storm_counts": {
                    "hail": market.storms.hail,
                    "wind": market.storms.wind,
                    "hurricane": market.storms.hurricane,
                    "flood": market.storms.flood,
                    "hazard_score": market.storms.score,
                },
                "feature_count": len(market.features),
            }
        )
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(summary, fh, indent=2)
    print(f"[✓] summary written to {path}")


def main() -> None:
    storm_rows: List[Dict[str, str]] = []
    for year in (2020, 2021, 2022, 2023, 2024):
        csv_path = Path(f"data/raw/StormEvents_details_{year}.csv.gz")
        if not csv_path.exists():
            print(f"[!] missing {csv_path}, skipping this year")
            continue
        storm_rows.extend(load_storm_catalog(csv_path))
    if not storm_rows:
        raise SystemExit("No NOAA storm catalog files found in data/raw/.")
    update_storm_stats(MARKETS, storm_rows)

    for market in MARKETS:
        print(f"[•] fetching OSM buildings for {market.name} …")
        data = fetch_overpass(market)
        extract_features(market, data)
        print(f"    collected {len(market.features)} buildings; hazard score {market.storms.score}")

    write_geojson(MARKETS, Path("data/geojson/roofing_markets.geojson"))
    write_market_summary(MARKETS, Path("data/intermediate/roofing_market_summary.json"))


if __name__ == "__main__":
    main()
