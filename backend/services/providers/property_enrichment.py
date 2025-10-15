import asyncio
import hashlib
import logging
import random
from dataclasses import dataclass
from datetime import date
from typing import Optional

import httpx

from config import get_settings
from services.etl.politeness import PoliteFetcher, SitePolitenessPolicy
from services.resilience import AsyncRateLimiter, CircuitBreaker


settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class PropertyProfile:
    year_built: Optional[int]
    property_type: Optional[str]
    lot_size_sqft: Optional[int]
    roof_material: Optional[str]
    bedrooms: Optional[int]
    bathrooms: Optional[float]
    square_feet: Optional[int]
    property_value: Optional[int]
    last_roof_replacement_year: Optional[int]
    source: str = "synthetic"


class PropertyEnrichmentService:
    """Pulls detailed property metadata from external providers."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=settings.http_timeout_seconds)
        resilience = settings.pipeline_resilience
        self._rate_limiter = AsyncRateLimiter(resilience.property_requests_per_minute, 60.0)
        self._breaker = CircuitBreaker(
            "property.enrichment",
            failure_threshold=resilience.provider_failure_threshold,
            recovery_timeout=resilience.provider_recovery_seconds,
        )
        self._retry_attempts = resilience.provider_retry_attempts
        self._fetcher = PoliteFetcher(
            self._client,
            policies=[
                SitePolitenessPolicy(
                    domain="api.estated.com",
                    delay_seconds=0.5,
                    respect_robots=True,
                    headers={"Accept": "application/json"},
                )
            ],
        )

    async def enrich(self, address: str, latitude: float, longitude: float) -> PropertyProfile:
        if not settings.feature_flags.use_mock_property_enrichment:
            data = await self._fetch_remote(address, latitude, longitude)
            if data:
                return data
        return self._generate_fallback(address)

    async def _fetch_remote(self, address: str, latitude: float, longitude: float) -> Optional[PropertyProfile]:
        # Try free FCC + Census sources first; if insufficient, try configured paid API.
        profile = await self._fetch_fcc_and_census(address, latitude, longitude)
        if profile:
            return profile
        if not settings.providers.property_enrichment_api_key:
            return None
        if not self._breaker.allow_call():
            logger.info("Property enrichment circuit open; falling back for %s", address)
            return None

        last_exc: Optional[Exception] = None
        for attempt in range(1, self._retry_attempts + 1):
            try:
                async with self._rate_limiter:
                    response = await self._fetcher.get(
                        "https://api.estated.com/property/v3",
                        params={
                            "token": settings.providers.property_enrichment_api_key,
                            "combined_address": address,
                            "latitude": latitude,
                            "longitude": longitude,
                        },
                    )
                response.raise_for_status()
                payload = response.json()
                self._breaker.record_success()
                break
            except (httpx.HTTPError, httpx.RequestError) as exc:
                last_exc = exc
                logger.warning(
                    "Property enrichment attempt %s failed for %s: %s",
                    attempt,
                    address,
                    exc,
                )
                await asyncio.sleep(self._retry_delay(attempt))
        else:
            self._breaker.record_failure(str(last_exc) if last_exc else None)
            return None

        property_data = payload.get("properties", [{}])[0]
        structure = property_data.get("structure", {})
        valuation = property_data.get("valuation", {})
        improvement = property_data.get("improvement", {})

        return PropertyProfile(
            year_built=structure.get("year_built"),
            property_type=structure.get("type"),
            lot_size_sqft=property_data.get("lot", {}).get("size"),
            roof_material=improvement.get("roof", {}).get("type"),
            bedrooms=structure.get("beds"),
            bathrooms=structure.get("baths"),
            square_feet=structure.get("area"),
            property_value=valuation.get("value"),
            last_roof_replacement_year=improvement.get("roof", {}).get("last_replacement_year"),
            source="remote",
        )

    async def _fetch_fcc_and_census(self, address: str, latitude: float, longitude: float) -> Optional[PropertyProfile]:
        """Use free FCC blocks API and Census/ACS summary to estimate property data.

        - FCC API (https://geo.fcc.gov/api/census/): no key required.
        - Public ACS endpoints via api.census.gov (key optional for small usage).
        We keep queries modest and time-bounded, returning a coarse profile.
        """
        try:
            async with self._rate_limiter:
                block_resp = await self._client.get(
                    "https://geo.fcc.gov/api/census/block/find",
                    params={
                        "latitude": f"{latitude}",
                        "longitude": f"{longitude}",
                        "format": "json",
                    },
                )
            block_resp.raise_for_status()
            block = block_resp.json() or {}
        except Exception:
            return None

        county_fips = (((block.get("County") or {}).get("FIPS")) or "")
        state_fips = (((block.get("State") or {}).get("FIPS")) or "")
        if not county_fips or not state_fips:
            return None

        # Use coarse ACS variables as heuristics for typical year built, property value range, etc.
        # Example ACS 5-year (subject to change); we guard errors aggressively.
        try:
            # Median home value (B25077_001E), Median year structure built (approx via distribution)
            # Here we only use median value as a proxy.
            acs_resp = await self._client.get(
                "https://api.census.gov/data/2022/acs/acs5",
                params={
                    "get": "NAME,B25077_001E",
                    "for": f"county:{county_fips[-3:]}",
                    "in": f"state:{state_fips}",
                },
            )
            acs_resp.raise_for_status()
            rows = acs_resp.json() or []
        except Exception:
            rows = []

        median_value: Optional[int] = None
        if len(rows) >= 2 and isinstance(rows[1], list):
            try:
                median_value = int(float(rows[1][1])) if rows[1][1] not in (None, "null", "NaN") else None
            except Exception:
                median_value = None

        # Build a coarse profile using heuristics; better than fully synthetic
        current_year = date.today().year
        year_built = current_year - 22  # coarse heuristic default
        lot_size = None
        square_feet = None
        property_value = median_value or 300_000

        return PropertyProfile(
            year_built=year_built,
            property_type="single_family",
            lot_size_sqft=lot_size,
            roof_material=None,
            bedrooms=None,
            bathrooms=None,
            square_feet=square_feet,
            property_value=property_value,
            last_roof_replacement_year=None,
            source="fcc_census",
        )

    def _generate_fallback(self, address: str) -> PropertyProfile:
        seed = int(hashlib.sha1(address.encode("utf-8")).hexdigest(), 16) % (2**32)
        random.seed(seed)
        current_year = date.today().year

        year_built = random.randint(1955, 2010)
        property_type = random.choice(["single_family", "townhouse", "duplex"])
        lot_size = random.randint(4500, 12000)
        roof_material = random.choice(["asphalt_shingle", "metal", "tile", "synthetic"])
        square_feet = random.randint(1400, 4200)
        bedrooms = random.randint(2, 5)
        bathrooms = random.choice([2, 2.5, 3, 3.5, 4])
        property_value = random.randint(200_000, 850_000)
        roof_age = random.randint(8, 28)
        last_replacement_year = current_year - roof_age

        return PropertyProfile(
            year_built=year_built,
            property_type=property_type,
            lot_size_sqft=lot_size,
            roof_material=roof_material,
            bedrooms=bedrooms,
            bathrooms=bathrooms,
            square_feet=square_feet,
            property_value=property_value,
            last_roof_replacement_year=last_replacement_year,
            source="synthetic",
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    def _retry_delay(self, attempt: int) -> float:
        base = 0.5 * (2 ** (attempt - 1))
        return min(base, 5.0)


async def enrich_property(address: str, latitude: float, longitude: float) -> PropertyProfile:
    service = PropertyEnrichmentService()
    try:
        return await service.enrich(address, latitude, longitude)
    finally:
        await service.aclose()
