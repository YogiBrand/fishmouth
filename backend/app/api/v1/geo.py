# app/api/v1/geo.py — Minimal IP geolocation endpoint for personalization
# Option A: MaxMind (geoip2). Option B: ipinfo.io as fallback. Option C: naive headers.
from fastapi import APIRouter, Request
from typing import Optional

from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/geo", tags=["geo"])

class GeoOut(BaseModel):
    city: Optional[str] = None
    region: Optional[str] = None
    country: Optional[str] = None

@router.get("/lookup", response_model=GeoOut)
async def lookup(request: Request):
    # NOTE: Replace this with your preferred provider. This stub uses headers only.
    city = request.headers.get("X-Geo-City")
    region = request.headers.get("X-Geo-Region")
    country = request.headers.get("X-Geo-Country", "US")
    return GeoOut(city=city, region=region, country=country)
