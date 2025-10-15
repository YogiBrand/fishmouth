"""Infer a visitor's location for marketing personalization."""

from __future__ import annotations

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api/v1/geo", tags=["geo"])

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
def guess(request: Request):
    """Guess the visitor's geo from headers, then timezone."""

    city = request.headers.get("X-Geo-City")
    state = request.headers.get("X-Geo-Region")
    country = request.headers.get("CF-IPCountry") or request.headers.get("X-Geo-Country")

    if city or state or country:
        return {
            "city": city,
            "state": state,
            "country": country or "US",
            "source": "headers",
        }

    timezone = request.headers.get("X-Client-Timezone")
    if timezone and timezone in TZ_TO_STATE:
        return {
            "city": None,
            "state": TZ_TO_STATE[timezone],
            "country": "US",
            "source": "timezone",
        }

    return {"city": None, "state": "United States", "country": "US", "source": "default"}
