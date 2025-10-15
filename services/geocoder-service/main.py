"""
Geocoder Service (FREE-FIRST)

Forward geocoding using OpenStreetMap Nominatim (polite usage), optional Mapbox
fallback when MAPBOX_TOKEN is present. Simple FastAPI microservice with health
endpoints. Intended for low-rate development and local use.
"""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


SERVICE_NAME = "geocoder-service"
USER_AGENT = os.getenv("GEOCODER_USER_AGENT", "fishmouth-geocoder/1.0 (+local)")
NOMINATIM_BASE = os.getenv("NOMINATIM_BASE", "https://nominatim.openstreetmap.org")
MAPBOX_TOKEN = os.getenv("MAPBOX_TOKEN", os.getenv("MAPBOX_API_KEY", ""))


app = FastAPI(
    title="Geocoder Service",
    description="FREE-FIRST geocoding via OSM Nominatim, with optional Mapbox fallback.",
    version="0.1.0",
)


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "timestamp": datetime.utcnow().isoformat(),
        "providers": {
            "nominatim": True,
            "mapbox": bool(MAPBOX_TOKEN),
        },
    }


@app.get("/readyz")
async def readyz() -> Dict[str, Any]:
    return {"status": "healthy", "service": SERVICE_NAME}


class GeocodeRequest(BaseModel):
    address: str = Field(..., min_length=3)
    limit: int = Field(1, ge=1, le=5)


class GeocodeResult(BaseModel):
    label: str
    lat: float
    lon: float
    provider: str


class GeocodeResponse(BaseModel):
    success: bool
    results: List[GeocodeResult]


async def _geocode_nominatim(address: str, limit: int) -> List[GeocodeResult]:
    headers = {"User-Agent": USER_AGENT}
    params = {"q": address, "format": "json", "limit": str(limit), "addressdetails": "0"}
    async with httpx.AsyncClient(headers=headers, timeout=15.0) as client:
        resp = await client.get(f"{NOMINATIM_BASE}/search", params=params)
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Nominatim error: {exc}")
        payload = resp.json()
    out: List[GeocodeResult] = []
    for item in payload or []:
        try:
            out.append(
                GeocodeResult(
                    label=str(item.get("display_name") or address),
                    lat=float(item["lat"]),
                    lon=float(item["lon"]),
                    provider="nominatim",
                )
            )
        except Exception:
            continue
    return out


async def _geocode_mapbox(address: str, limit: int) -> List[GeocodeResult]:
    if not MAPBOX_TOKEN:
        return []
    params = {"access_token": MAPBOX_TOKEN, "limit": str(limit)}
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            f"https://api.mapbox.com/geocoding/v5/mapbox.places/{httpx.utils.quote(address)}.json",
            params=params,
        )
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            return []
        payload = resp.json()
    features = (payload or {}).get("features") or []
    out: List[GeocodeResult] = []
    for feat in features:
        coords = (feat.get("center") or [])
        if len(coords) == 2:
            out.append(
                GeocodeResult(
                    label=str(feat.get("place_name") or address),
                    lon=float(coords[0]),
                    lat=float(coords[1]),
                    provider="mapbox",
                )
            )
    return out


@app.post("/geocode", response_model=GeocodeResponse)
async def geocode(payload: GeocodeRequest) -> GeocodeResponse:
    # Try Nominatim first (free), then Mapbox if available
    results = await _geocode_nominatim(payload.address, payload.limit)
    if not results:
        results = await _geocode_mapbox(payload.address, payload.limit)
    return GeocodeResponse(success=bool(results), results=results)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8015)


