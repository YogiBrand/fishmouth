"""Lightweight GeoIP lookup used for marketing personalization."""

from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1/geoip", tags=["geoip"])

_FAKE_LOOKUPS: Dict[str, Dict[str, str]] = {
    "127.0.0.1": {"city": "Dallas", "region": "TX"},
    "::1": {"city": "Dallas", "region": "TX"},
}

_DEFAULT_LOCATION = {"city": "Dallas", "region": "TX"}


@router.get("", summary="Resolve approximate location for personalization")
async def geoip_lookup(request: Request) -> Dict[str, str]:
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else None)
    if client_ip and "," in client_ip:
        client_ip = client_ip.split(",", 1)[0].strip()

    location = _FAKE_LOOKUPS.get(client_ip or "")
    if location:
        return {**location, "ip": client_ip}

    return {**_DEFAULT_LOCATION, "ip": client_ip}
