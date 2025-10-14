import asyncio
import hashlib
import logging
import random
from dataclasses import dataclass
from typing import List, Optional
from urllib.parse import quote_plus

import httpx
from config import get_settings
from services.resilience import AsyncRateLimiter, CircuitBreaker


settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class PropertyCandidate:
    address: str
    city: Optional[str]
    state: Optional[str]
    postal_code: Optional[str]
    latitude: float
    longitude: float
    source: str = "synthetic"


class PropertyDiscoveryService:
    """Discovers property coordinates for a target area."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(
            timeout=settings.http_timeout_seconds,
            headers={"User-Agent": "FishMouthAI/1.0"},
        )
        resilience = settings.pipeline_resilience
        self._rate_limiter = AsyncRateLimiter(resilience.property_requests_per_minute, 60.0)
        self._mapbox_breaker = CircuitBreaker(
            "property.mapbox",
            failure_threshold=resilience.provider_failure_threshold,
            recovery_timeout=resilience.provider_recovery_seconds,
        )
        self._nominatim_breaker = CircuitBreaker(
            "property.nominatim",
            failure_threshold=resilience.provider_failure_threshold,
            recovery_timeout=resilience.provider_recovery_seconds,
        )
        self._retry_attempts = resilience.provider_retry_attempts

    async def discover(self, area_name: str, limit: int | None = None) -> List[PropertyCandidate]:
        limit = limit or settings.property_discovery_limit

        if settings.feature_flags.use_mock_property_discovery:
            return self._generate_synthetic(area_name, limit)

        candidates = await self._discover_via_mapbox(area_name, limit)
        if not candidates:
            candidates = await self._discover_via_nominatim(area_name, limit)
        if not candidates:
            candidates = self._generate_synthetic(area_name, limit)
        return candidates[:limit]

    async def _discover_via_mapbox(self, area_name: str, limit: int) -> List[PropertyCandidate]:
        if not settings.providers.mapbox_token:
            return []
        params = {
            "autocomplete": "false",
            "limit": str(min(limit, 100)),
            "types": "address",
            "access_token": settings.providers.mapbox_token,
        }
        url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{quote_plus(area_name)}.json"
        if not self._mapbox_breaker.allow_call():
            logger.info("Mapbox property circuit open; skipping discovery for %s", area_name)
            return []

        last_exc: Optional[Exception] = None
        for attempt in range(1, self._retry_attempts + 1):
            try:
                async with self._rate_limiter:
                    response = await self._client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                self._mapbox_breaker.record_success()
                break
            except (httpx.HTTPError, httpx.RequestError) as exc:
                last_exc = exc
                logger.warning(
                    "Mapbox discovery attempt %s failed for %s: %s",
                    attempt,
                    area_name,
                    exc,
                )
                await asyncio.sleep(self._retry_delay(attempt))
        else:
            self._mapbox_breaker.record_failure(str(last_exc) if last_exc else None)
            return []

        features = data.get("features", [])
        return [
            PropertyCandidate(
                address=feature.get("place_name"),
                city=self._get_context(feature, "place"),
                state=self._get_context(feature, "region"),
                postal_code=self._get_context(feature, "postcode"),
                latitude=feature["center"][1],
                longitude=feature["center"][0],
                source="mapbox",
            )
            for feature in features if feature.get("center")
        ]

    async def _discover_via_nominatim(self, area_name: str, limit: int) -> List[PropertyCandidate]:
        params = {
            "q": area_name,
            "format": "jsonv2",
            "addressdetails": 1,
            "limit": str(min(limit, 50)),
        }
        if not self._nominatim_breaker.allow_call():
            logger.info("Nominatim circuit open; skipping discovery for %s", area_name)
            return []

        last_exc: Optional[Exception] = None
        payload: List[dict] = []
        for attempt in range(1, self._retry_attempts + 1):
            try:
                async with self._rate_limiter:
                    response = await self._client.get(
                        "https://nominatim.openstreetmap.org/search",
                        params=params,
                    )
                response.raise_for_status()
                payload = response.json()
                self._nominatim_breaker.record_success()
                break
            except (httpx.HTTPError, httpx.RequestError) as exc:
                last_exc = exc
                logger.warning(
                    "Nominatim discovery attempt %s failed for %s: %s",
                    attempt,
                    area_name,
                    exc,
                )
                await asyncio.sleep(self._retry_delay(attempt))
        else:
            self._nominatim_breaker.record_failure(str(last_exc) if last_exc else None)
            return []

        candidates: List[PropertyCandidate] = []
        for item in payload:
            address = item.get("display_name")
            addr_details = item.get("address", {})
            if not address or "house_number" not in addr_details:
                continue
            candidates.append(
                PropertyCandidate(
                    address=address,
                    city=addr_details.get("city") or addr_details.get("town") or addr_details.get("village"),
                    state=addr_details.get("state"),
                    postal_code=addr_details.get("postcode"),
                    latitude=float(item["lat"]),
                    longitude=float(item["lon"]),
                    source="nominatim",
                )
            )
        return candidates

    def _generate_synthetic(self, area_name: str, limit: int) -> List[PropertyCandidate]:
        seed = int(hashlib.sha1(area_name.encode("utf-8")).hexdigest(), 16) % (2**32)
        random.seed(seed)
        base_lat, base_lng = self._guess_coordinates(area_name)
        street_names = ["Oak", "Pine", "Cedar", "Maple", "Birch", "Elm", "Chestnut", "Walnut"]
        street_suffix = ["St", "Ave", "Dr", "Ln", "Ct", "Pl", "Way"]

        candidates: List[PropertyCandidate] = []
        for _ in range(limit):
            lat = base_lat + random.uniform(-0.08, 0.08)
            lng = base_lng + random.uniform(-0.08, 0.08)
            number = random.randint(100, 9999)
            street = random.choice(street_names)
            suffix = random.choice(street_suffix)
            city = area_name.split(",")[0].strip().title()
            state = area_name.split(",")[1].strip().upper() if "," in area_name else "FL"
            zip_code = f"{random.randint(30_000, 39_999)}"
            address = f"{number} {street} {suffix}, {city}, {state} {zip_code}"
            candidates.append(
                PropertyCandidate(
                    address=address,
                    city=city,
                    state=state,
                    postal_code=zip_code,
                    latitude=lat,
                    longitude=lng,
                    source="synthetic",
                )
            )
        return candidates

    def _get_context(self, feature: dict, ctx_type: str) -> Optional[str]:
        for ctx in feature.get("context", []):
            if ctx.get("id", "").startswith(f"{ctx_type}."):
                return ctx.get("text")
        return None

    def _guess_coordinates(self, area_name: str) -> tuple[float, float]:
        lookup = {
            "miami": (25.7617, -80.1918),
            "orlando": (28.5383, -81.3792),
            "tampa": (27.9506, -82.4572),
            "jacksonville": (30.3322, -81.6557),
            "atlanta": (33.7490, -84.3880),
            "dallas": (32.7767, -96.7970),
            "houston": (29.7604, -95.3698),
            "phoenix": (33.4484, -112.0740),
        }
        normalized = area_name.lower().split(",")[0].strip()
        return lookup.get(normalized, (28.5383, -81.3792))

    async def aclose(self) -> None:
        await self._client.aclose()

    def _retry_delay(self, attempt: int) -> float:
        base = 0.5 * (2 ** (attempt - 1))
        return min(base, 5.0)


async def discover_properties(area_name: str, limit: int | None = None) -> List[PropertyCandidate]:
    service = PropertyDiscoveryService()
    try:
        return await service.discover(area_name, limit)
    finally:
        await service.aclose()
