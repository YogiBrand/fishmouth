"""Map endpoints for lead geo overlays and heat maps."""

from __future__ import annotations

from math import ceil
from typing import Dict, Iterable, List, Optional, Sequence

from fastapi import APIRouter, HTTPException, Query

from app.core.database import get_db


router = APIRouter(prefix="/api/v1/maps", tags=["maps"])


def _classify_tier(score: Optional[float]) -> str:
    if score is None:
        return "unknown"
    if score >= 85:
        return "hot"
    if score >= 70:
        return "warm"
    if score >= 50:
        return "cold"
    return "nurture"


async def _fetch_leads_in_bbox(
    west: float,
    south: float,
    east: float,
    north: float,
    status_filters: Optional[Sequence[str]] = None,
) -> List[Dict[str, object]]:
    db = await get_db()
    try:
        query = """
            SELECT
                id,
                address,
                city,
                state,
                zip_code,
                latitude,
                longitude,
                lead_score,
                priority,
                replacement_urgency,
                damage_indicators,
                estimated_value,
                homeowner_name,
                status,
                created_at,
                updated_at
            FROM leads
            WHERE latitude IS NOT NULL
              AND longitude IS NOT NULL
              AND longitude BETWEEN :west AND :east
              AND latitude BETWEEN :south AND :north
        """
        params: Dict[str, object] = {"west": west, "east": east, "south": south, "north": north}
        if status_filters:
            query += " AND status = ANY(:status_filters)"
            params["status_filters"] = status_filters
        query += " ORDER BY lead_score DESC NULLS LAST LIMIT 2000"
        return await db.fetch_all(query, params)
    finally:
        await db.close()


@router.get("/leads")
async def get_leads_geojson(
    west: float = Query(..., ge=-180, le=180),
    south: float = Query(..., ge=-90, le=90),
    east: float = Query(..., ge=-180, le=180),
    north: float = Query(..., ge=-90, le=90),
    tiers: Optional[str] = Query(None, description="Comma separated list of tiers: hot,warm,cold,nurture"),
):
    """Return a GeoJSON FeatureCollection with leads in the requested bounding box."""

    if west >= east or south >= north:
        raise HTTPException(status_code=400, detail="Invalid bounding box")

    tier_filter = None
    if tiers:
        tier_filter = {value.strip().lower() for value in tiers.split(",") if value.strip()}

    rows = await _fetch_leads_in_bbox(west, south, east, north)
    features: List[Dict[str, object]] = []

    for row in rows:
        tier = _classify_tier(row.get("lead_score"))
        if tier_filter and tier not in tier_filter:
            continue

        updated_at = row.get("updated_at") or row.get("created_at")
        if updated_at is not None and hasattr(updated_at, "isoformat"):
            updated_at = updated_at.isoformat()

        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [row.get("longitude"), row.get("latitude")],
                },
                "properties": {
                    "id": row.get("id"),
                    "address": row.get("address"),
                    "city": row.get("city"),
                    "state": row.get("state"),
                    "zip": row.get("zip_code"),
                    "lead_score": row.get("lead_score"),
                    "tier": tier,
                    "priority": row.get("priority"),
                    "urgency": row.get("replacement_urgency"),
                    "damage_indicators": row.get("damage_indicators") or [],
                    "estimated_value": float(row.get("estimated_value") or 0) if row.get("estimated_value") is not None else None,
                    "homeowner_name": row.get("homeowner_name"),
                    "status": row.get("status"),
                    "last_updated_at": updated_at,
                },
            }
        )

    return {"type": "FeatureCollection", "features": features}


def _bucketize(values: Iterable[Dict[str, object]], buckets: int = 6) -> List[Dict[str, object]]:
    cells = max(1, min(ceil(buckets), 20))
    grid: Dict[tuple[int, int], List[Dict[str, object]]] = {}

    for item in values:
        ix = item["grid_x"]
        iy = item["grid_y"]
        grid.setdefault((ix, iy), []).append(item)

    payload: List[Dict[str, object]] = []
    for (gx, gy), items in grid.items():
        payload.append(
            {
                "grid": [gx, gy],
                "count": len(items),
                "avg_score": sum(float(x.get("lead_score") or 0) for x in items) / max(len(items), 1),
                "tier_mix": {
                    tier: sum(1 for x in items if x.get("tier") == tier)
                    for tier in {"hot", "warm", "cold", "nurture"}
                },
            }
        )
    return payload


@router.get("/heat")
async def get_heat(
    west: float = Query(..., ge=-180, le=180),
    south: float = Query(..., ge=-90, le=90),
    east: float = Query(..., ge=-180, le=180),
    north: float = Query(..., ge=-90, le=90),
    cells: int = Query(10, ge=2, le=50),
):
    """Return coarse heat map buckets (counts, average score) for the viewport."""

    if west >= east or south >= north:
        raise HTTPException(status_code=400, detail="Invalid bounding box")

    rows = await _fetch_leads_in_bbox(west, south, east, north)
    if not rows:
        return {"buckets": []}

    cell_size_lon = (east - west) / cells
    cell_size_lat = (north - south) / cells

    enriched: List[Dict[str, object]] = []
    for row in rows:
        lon = float(row.get("longitude"))
        lat = float(row.get("latitude"))
        grid_x = int((lon - west) / cell_size_lon)
        grid_y = int((lat - south) / cell_size_lat)
        grid_x = max(0, min(cells - 1, grid_x))
        grid_y = max(0, min(cells - 1, grid_y))
        enriched.append(
            {
                "grid_x": grid_x,
                "grid_y": grid_y,
                "lead_score": row.get("lead_score"),
                "tier": _classify_tier(row.get("lead_score")),
            }
        )

    buckets_payload = _bucketize(enriched, buckets=cells)
    return {"buckets": buckets_payload, "meta": {"cells": cells}}
