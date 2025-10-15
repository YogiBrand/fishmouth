import asyncio
import hashlib
import logging
import random
from dataclasses import dataclass
from typing import Optional

import httpx

from config import get_settings
from services.etl.politeness import PoliteFetcher, SitePolitenessPolicy
from services.resilience import AsyncRateLimiter, CircuitBreaker


settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class ContactProfile:
    homeowner_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    length_of_residence_years: Optional[int]
    household_income: Optional[int]
    confidence: float
    source: str = "synthetic"


class ContactEnrichmentService:
    """Enrich homeowner contact details via third-party APIs with deterministic fallbacks."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=settings.http_timeout_seconds)
        resilience = settings.pipeline_resilience
        self._rate_limiter = AsyncRateLimiter(resilience.contact_requests_per_minute, 60.0)
        self._breaker = CircuitBreaker(
            "contact.enrichment",
            failure_threshold=resilience.provider_failure_threshold,
            recovery_timeout=resilience.provider_recovery_seconds,
        )
        self._retry_attempts = resilience.provider_retry_attempts
        self._fetcher = PoliteFetcher(
            self._client,
            policies=[
                SitePolitenessPolicy(
                    domain="api.truepeoplesearch.io",
                    delay_seconds=0.75,
                    respect_robots=True,
                    headers={"Accept": "application/json"},
                )
            ],
        )

    async def enrich(self, address: str, city: Optional[str], state: Optional[str]) -> ContactProfile:
        if not settings.feature_flags.use_mock_contact_enrichment:
            profile = await self._fetch_remote(address, city, state)
            if profile:
                return profile
        return self._generate_fallback(address)

    async def _fetch_remote(self, address: str, city: Optional[str], state: Optional[str]) -> Optional[ContactProfile]:
        if not settings.providers.contact_enrichment_api_key:
            return None
        if not self._breaker.allow_call():
            logger.info("Contact enrichment circuit open; falling back for %s", address)
            return None
        query = f"{address}, {city or ''} {state or ''}".strip(", ")
        last_exc: Optional[Exception] = None
        payload: Optional[dict] = None
        for attempt in range(1, self._retry_attempts + 1):
            try:
                async with self._rate_limiter:
                    response = await self._fetcher.get(
                        "https://api.truepeoplesearch.io/v1/lookup",
                        params={"q": query, "key": settings.providers.contact_enrichment_api_key},
                    )
                response.raise_for_status()
                payload = response.json()
                self._breaker.record_success()
                break
            except (httpx.HTTPError, httpx.RequestError) as exc:
                last_exc = exc
                logger.warning(
                    "Contact enrichment attempt %s failed for %s: %s",
                    attempt,
                    query,
                    exc,
                )
                await asyncio.sleep(self._retry_delay(attempt))
        else:
            self._breaker.record_failure(str(last_exc) if last_exc else None)
            return None

        if not payload:
            return None

        results = payload.get("results", [])
        if not results:
            return None
        primary = results[0]
        return ContactProfile(
            homeowner_name=primary.get("name"),
            email=primary.get("email"),
            phone=primary.get("phone"),
            length_of_residence_years=primary.get("length_of_residence"),
            household_income=primary.get("household_income"),
            confidence=primary.get("confidence", 0.8),
            source="remote",
        )

    def _generate_fallback(self, address: str) -> ContactProfile:
        seed = int(hashlib.sha1(address.encode("utf-8")).hexdigest(), 16) % (2**32)
        random.seed(seed)
        first_names = ["Emily", "Jacob", "Sophia", "Michael", "Isabella", "Christopher", "Emma", "Olivia", "James", "Amelia"]
        last_names = ["Anderson", "Martinez", "Thompson", "Hernandez", "Williams", "Brown", "Johnson", "Davis", "Garcia", "Miller"]
        first = random.choice(first_names)
        last = random.choice(last_names)
        email = f"{first.lower()}.{last.lower()}@{random.choice(['gmail.com', 'yahoo.com', 'outlook.com'])}"
        phone = f"({random.randint(200, 989)}) {random.randint(200, 989):03d}-{random.randint(1000, 9999):04d}"
        residence_years = random.randint(1, 18)
        income = random.randint(60_000, 180_000)

        return ContactProfile(
            homeowner_name=f"{first} {last}",
            email=email,
            phone=phone,
            length_of_residence_years=residence_years,
            household_income=income,
            confidence=0.62,
            source="synthetic",
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    def _retry_delay(self, attempt: int) -> float:
        base = 0.5 * (2 ** (attempt - 1))
        return min(base, 5.0)


async def enrich_contact(address: str, city: Optional[str], state: Optional[str]) -> ContactProfile:
    service = ContactEnrichmentService()
    try:
        return await service.enrich(address, city, state)
    finally:
        await service.aclose()
