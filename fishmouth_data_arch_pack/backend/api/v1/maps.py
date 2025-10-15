from fastapi import APIRouter, Query
from typing import Optional, List
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/maps", tags=["maps"])

class BboxRequest(BaseModel):
    west: float
    south: float
    east: float
    north: float
    tiers: Optional[List[str]] = None  # ['hot','warm','cold']

@router.get("/leads")
def get_leads_geojson(west: float, south: float, east: float, north: float, tiers: Optional[str] = None):
    """Return GeoJSON FeatureCollection of leads in bbox (server cluster optional)."""
    # TODO: query PostGIS using ST_MakeEnvelope and leads_geo view
    features = []  # assemble from DB rows
    return { "type":"FeatureCollection", "features": features }

@router.get("/heat")
def get_heat(west: float, south: float, east: float, north: float):
    """Return simple heat buckets for map; compute in SQL or Python."""
    # TODO: aggregate density in grid
    return { "buckets": [] }
