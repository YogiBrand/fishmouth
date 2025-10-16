from __future__ import annotations

import asyncio
import os
import time
from typing import Any, Dict, Optional
from urllib.parse import quote_plus

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from services.shared.telemetry_middleware import TelemetryMW

app = FastAPI(title="Mapping Intelligence (8025)", version="1.0.0")
app.add_middleware(TelemetryMW)

TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8025"
MAPBOX_TOKEN = os.getenv("MAPBOX_API_KEY", "")
MAPBOX_PROXIMITY = os.getenv("MAPBOX_PROXIMITY")
NOMINATIM_EMAIL = os.getenv("NOMINATIM_EMAIL")
NOMINATIM_USER_AGENT = os.getenv("USGS_USER_AGENT", "FishMouth/1.0 (+info@yogibrand.co)")

_nominatim_lock = asyncio.Lock()
_last_nominatim_call: float = 0.0


async def _emit_cost(item: str, quantity: float, unit: str, unit_cost: float, meta: dict | None = None):
    if SERVICE_ID == "8030":
        return
    payload = {
        "service": SERVICE_ID,
        "item": item,
        "quantity": quantity,
        "unit": unit,
        "unit_cost": unit_cost,
        "meta": meta or {},
    }
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(f"{TELEMETRY_URL}/cost", json=payload)
    except Exception:
        pass


class Health(BaseModel):
    status: str = "ok"


@app.get("/health", response_model=Health)
async def health() -> Health:
    return Health()


class GeocodeRequest(BaseModel):
    address: str


class GeocodeResponse(BaseModel):
    normalized_address: str
    lat: float
    lon: float
    source: str
    confidence: float | None = None
    components: Dict[str, Any] | None = None


async def _mapbox_geocode(address: str) -> Optional[Dict[str, Any]]:
    if not MAPBOX_TOKEN:
        return None
    params = {
        "autocomplete": "false",
        "limit": "1",
        "types": "address",
        "access_token": MAPBOX_TOKEN,
    }
    if MAPBOX_PROXIMITY:
        params["proximity"] = MAPBOX_PROXIMITY
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{quote_plus(address)}.json"
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(url, params=params)
    if response.status_code == 401:
        return None
    response.raise_for_status()
    data = response.json()
    features = data.get("features") or []
    if not features:
        return None
    feature = features[0]
    center = feature.get("center") or []
    if len(center) != 2:
        return None

    components: Dict[str, Any] = {}
    for ctx in feature.get("context") or []:
        ctx_id = (ctx.get("id") or "").split(".")[0]
        if ctx_id:
            components[ctx_id] = ctx.get("text")
    if feature.get("address"):
        components["address_number"] = feature["address"]
    if feature.get("text"):
        components.setdefault("street", feature["text"])

    return {
        "normalized_address": feature.get("place_name"),
        "lat": center[1],
        "lon": center[0],
        "source": "mapbox",
        "confidence": feature.get("relevance"),
        "components": components or None,
    }


async def _nominatim_geocode(address: str) -> Optional[Dict[str, Any]]:
    global _last_nominatim_call
    params = {"q": address, "format": "jsonv2", "limit": "1", "addressdetails": 1}
    if NOMINATIM_EMAIL:
        params["email"] = NOMINATIM_EMAIL
    headers = {"User-Agent": NOMINATIM_USER_AGENT}
    async with _nominatim_lock:
        now = time.monotonic()
        elapsed = now - _last_nominatim_call
        if elapsed < 1.0:
            await asyncio.sleep(1.0 - elapsed)
        async with httpx.AsyncClient(timeout=10.0, headers=headers) as client:
            response = await client.get("https://nominatim.openstreetmap.org/search", params=params)
        _last_nominatim_call = time.monotonic()
    response.raise_for_status()
    data = response.json()
    if not data:
        return None
    item = data[0]
    components = item.get("address") or {}
    return {
        "normalized_address": item.get("display_name"),
        "lat": float(item["lat"]),
        "lon": float(item["lon"]),
        "source": "nominatim",
        "confidence": float(item.get("importance")) if item.get("importance") else None,
        "components": components or None,
    }


@app.post("/geocode", response_model=GeocodeResponse)
async def geocode(req: GeocodeRequest) -> GeocodeResponse:
    provider = None
    result: Optional[Dict[str, Any]] = None

    try:
        result = await _mapbox_geocode(req.address)
        provider = "mapbox" if result else None
    except httpx.HTTPError as exc:
        provider = f"mapbox_error:{exc.__class__.__name__}"
        result = None

    if not result:
        try:
            result = await _nominatim_geocode(req.address)
            if result:
                provider = "nominatim"
        except httpx.HTTPError as exc:
            provider = provider or f"nominatim_error:{exc.__class__.__name__}"
            result = None

    if not result:
        raise HTTPException(status_code=404, detail="Address not found")

    asyncio.create_task(
        _emit_cost(
            "geocode_lookup",
            1,
            "request",
            0.01 if result["source"] == "mapbox" else 0.002,
            {"address": req.address, "provider": result["source"]},
        )
    )
    return GeocodeResponse(**result)
