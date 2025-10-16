"""
Community Street Imagery Service (FREE-FIRST)

Provides street-level imagery from community/open sources (Mapillary) and
optionally ranks/selects the best screenshots via a local heuristic or an
OpenRouter vision model when configured. Designed to be safe-by-default and
legal: no scraping of proprietary providers; uses public APIs within their
free tiers when tokens are provided.
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field


SERVICE_NAME = "street-imagery"

MAPILLARY_TOKEN = os.getenv("MAPILLARY_TOKEN", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.getenv("OPENROUTER_VISION_MODEL", "llava-v1.6-34b")


app = FastAPI(
    title="Community Street Imagery Service",
    description="Fetch street-level imagery from community/open sources (Mapillary), rank for value to an address, and return URLs + metadata.",
    version="0.1.0",
)


@app.get("/healthz")
async def healthz() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": SERVICE_NAME,
        "timestamp": datetime.utcnow().isoformat(),
        "providers": {
            "mapillary": bool(MAPILLARY_TOKEN),
            "openrouter": bool(OPENROUTER_API_KEY),
        },
    }


@app.get("/readyz")
async def readyz() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": SERVICE_NAME,
        "providers_available": [name for name, ok in {
            "mapillary": bool(MAPILLARY_TOKEN),
            "openrouter": bool(OPENROUTER_API_KEY),
        }.items() if ok],
    }


class CommunityStreetRequest(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    radius_m: int = Field(75, ge=10, le=500)
    max_results: int = Field(12, ge=1, le=50)
    max_angles: int = Field(3, ge=1, le=8)
    prefer_openrouter_ranking: bool = Field(True)


class CommunityStreetAsset(BaseModel):
    provider: str
    image_url: str
    heading: Optional[float] = None
    distance_m: Optional[float] = None
    captured_at: Optional[str] = None
    quality_score: Optional[float] = None
    occlusion_score: Optional[float] = None


class CommunityStreetResponse(BaseModel):
    success: bool
    assets: List[CommunityStreetAsset]
    note: Optional[str] = None


@dataclass
class Candidate:
    provider: str
    url: str
    heading: Optional[float]
    distance_m: float
    captured_at: Optional[str]


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.atan2(math.sqrt(a), math.sqrt(1 - a))


async def _fetch_mapillary_candidates(lat: float, lon: float, radius_m: int, max_results: int) -> List[Candidate]:
    if not MAPILLARY_TOKEN:
        return []
    # Mapillary Graph API v4: nearest images with geometry and thumb URL
    # Docs: https://www.mapillary.com/developer/api-documentation
    fields = "id,thumb_2048_url,captured_at,compass_angle,computed_geometry"
    params = {
        "access_token": MAPILLARY_TOKEN,
        "fields": fields,
        "limit": str(max_results),
        "closeto": f"{lon},{lat}",
    }
    url = "https://graph.mapillary.com/images"
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url, params=params)
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=502, detail=f"Mapillary error: {exc}")
        data = resp.json()

    items = data.get("data", []) if isinstance(data, dict) else []
    candidates: List[Candidate] = []
    for item in items:
        thumb = item.get("thumb_2048_url")
        geom = (item.get("computed_geometry") or {}).get("coordinates") or []
        if not thumb or len(geom) != 2:
            continue
        img_lon, img_lat = float(geom[0]), float(geom[1])
        dist = _haversine(lat, lon, img_lat, img_lon)
        if dist > radius_m:
            continue
        candidates.append(
            Candidate(
                provider="mapillary",
                url=thumb,
                heading=float(item.get("compass_angle") or 0.0),
                distance_m=round(dist, 2),
                captured_at=item.get("captured_at"),
            )
        )
    return candidates


def _score_occlusion_and_quality() -> Tuple[float, float]:
    # Lightweight placeholders: in lieu of full CV pipeline, return neutral scores.
    # The backend can apply richer scoring once the image bytes are analyzed.
    return 0.25, 0.65


async def _rank_with_openrouter(lat: float, lon: float, candidates: List[Candidate]) -> List[Candidate]:
    if not OPENROUTER_API_KEY or not candidates:
        return candidates
    # Provide the model with a short list of candidate URLs and ask for top-N order.
    # Many vision models accept image URLs as inputs via multi-part JSON.
    # We will do a simple completion with list of URLs and request a re-ordered list.
    prompt = (
        "You are ranking street-level photos for how well they show a house at coordinates "
        f"lat={lat:.5f}, lon={lon:.5f}. Prefer photos that likely show the front facade from curb, "
        "minimal occlusion (trees/vehicles), and good lighting. Return the same URLs in best-first order, one URL per line."
    )
    images = [c.url for c in candidates]
    payload: Dict[str, Any] = {
        "model": OPENROUTER_MODEL,
        "inputs": [
            {"role": "system", "content": prompt},
        ] + [
            {"role": "user", "content": {"type": "input_text", "text": url}} for url in images
        ],
    }
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://fishmouth.local/",
        "X-Title": "Street imagery ranking",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{OPENROUTER_BASE_URL}/chat/completions", json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except Exception:
        return candidates

    text = (
        (((data or {}).get("choices") or [{}])[0].get("message") or {}).get("content")
        if isinstance(data, dict)
        else None
    )
    if not text:
        return candidates
    ordered: List[str] = [line.strip() for line in text.splitlines() if line.strip().startswith("http")]
    if not ordered:
        return candidates
    url_to_candidate = {c.url: c for c in candidates}
    ranked: List[Candidate] = [url_to_candidate[u] for u in ordered if u in url_to_candidate]
    # append any not mentioned to preserve full set
    for c in candidates:
        if c not in ranked:
            ranked.append(c)
    return ranked


def _select_diverse_angles(candidates: List[Candidate], k: int) -> List[Candidate]:
    if k <= 0 or not candidates:
        return []
    chosen: List[Candidate] = []
    used: List[float] = []
    for c in candidates:
        if len(chosen) >= k:
            break
        if c.heading is not None and any(abs(c.heading - u) < 30 for u in used):
            continue
        chosen.append(c)
        if c.heading is not None:
            used.append(c.heading)
    return chosen


@app.post("/images/community/nearest", response_model=CommunityStreetResponse)
async def get_community_street_images(payload: CommunityStreetRequest) -> CommunityStreetResponse:
    """Return best street-level images near lat/lon from community sources.

    Selection order: Mapillary → (future: KartaView/Panoramax) → empty.
    Optionally uses OpenRouter to re-rank candidates.
    """
    if not MAPILLARY_TOKEN:
        return CommunityStreetResponse(success=True, assets=[], note="No community providers configured (set MAPILLARY_TOKEN)")

    candidates = await _fetch_mapillary_candidates(payload.lat, payload.lon, payload.radius_m, payload.max_results)
    if not candidates:
        return CommunityStreetResponse(success=True, assets=[], note="No images found within radius")

    if payload.prefer_openrouter_ranking:
        candidates = await _rank_with_openrouter(payload.lat, payload.lon, candidates)

    selected = _select_diverse_angles(candidates, payload.max_angles)

    assets: List[CommunityStreetAsset] = []
    for c in selected:
        occl, qual = _score_occlusion_and_quality()
        assets.append(
            CommunityStreetAsset(
                provider=c.provider,
                image_url=c.url,
                heading=c.heading,
                distance_m=c.distance_m,
                captured_at=c.captured_at,
                quality_score=round(qual, 3),
                occlusion_score=round(occl, 3),
            )
        )

    return CommunityStreetResponse(success=True, assets=assets)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8014)



