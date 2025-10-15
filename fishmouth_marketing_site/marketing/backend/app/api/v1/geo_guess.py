from fastapi import APIRouter, Request
from typing import Dict, Any

router = APIRouter(prefix="/api/v1/geo", tags=["geo"])

# Very lightweight heuristic. In production consider a CDN/edge-provided geo header.
TZ_TO_STATE = {
    "America/New_York": "NY",
    "America/Detroit": "MI",
    "America/Chicago": "IL",
    "America/Denver": "CO",
    "America/Phoenix": "AZ",
    "America/Los_Angeles": "CA",
    "America/Anchorage": "AK",
    "Pacific/Honolulu": "HI",
}

@router.get("/guess")
def guess(request: Request) -> Dict[str, Any]:
    # Prefer explicit headers from proxy
    city = request.headers.get("X-Geo-City")
    state = request.headers.get("X-Geo-Region")
    country = request.headers.get("CF-IPCountry") or request.headers.get("X-Geo-Country")

    if city or state or country:
        return {"city": city, "state": state, "country": country or "US", "source": "headers"}

    # Fallback to timezone hint from client (frontend will send X-Client-Timezone)
    tz = request.headers.get("X-Client-Timezone")
    if tz and tz in TZ_TO_STATE:
        return {"city": None, "state": TZ_TO_STATE[tz], "country": "US", "source": "timezone"}

    # Bottom-out fallback
    return {"city": None, "state": "United States", "country": "US", "source": "default"}
