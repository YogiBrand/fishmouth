"""HTTP politeness helpers for scraping and enrichment providers."""

from __future__ import annotations

import asyncio
import random
import time
from dataclasses import dataclass, field
from types import MappingProxyType
from typing import Dict, Iterable, Mapping, Optional
from urllib.parse import urlparse
from urllib import robotparser

import httpx


@dataclass(frozen=True)
class SitePolitenessPolicy:
    domain: str
    delay_seconds: float = 1.0
    headers: Mapping[str, str] = field(default_factory=dict)
    respect_robots: bool = False
    max_attempts: int = 3
    backoff_factor: float = 0.7
    user_agent: str = "FishMouthBot/1.0"

    def as_headers(self) -> Mapping[str, str]:
        return MappingProxyType({"User-Agent": self.user_agent, **dict(self.headers)})


class PoliteFetcher:
    """Wrapper around httpx to enforce domain-level politeness policies."""

    def __init__(
        self,
        client: httpx.AsyncClient,
        policies: Iterable[SitePolitenessPolicy],
        default_policy: Optional[SitePolitenessPolicy] = None,
    ) -> None:
        self._client = client
        self._policies: Dict[str, SitePolitenessPolicy] = {policy.domain: policy for policy in policies}
        self._default_policy = default_policy or SitePolitenessPolicy(domain="*")
        self._last_request: Dict[str, float] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._robots: Dict[str, Optional[robotparser.RobotFileParser]] = {}

    def _policy_for(self, domain: str) -> SitePolitenessPolicy:
        return self._policies.get(domain) or self._policies.get(f"*.{domain}") or self._default_policy

    async def _wait_for_slot(self, domain: str, policy: SitePolitenessPolicy) -> None:
        lock = self._locks.setdefault(domain, asyncio.Lock())
        async with lock:
            now = time.monotonic()
            delay = policy.delay_seconds
            last = self._last_request.get(domain)
            if last is not None:
                elapsed = now - last
                if elapsed < delay:
                    await asyncio.sleep(delay - elapsed)
            self._last_request[domain] = time.monotonic()

    async def _load_robots(self, domain: str, policy: SitePolitenessPolicy) -> Optional[robotparser.RobotFileParser]:
        if domain in self._robots:
            return self._robots[domain]

        parser = robotparser.RobotFileParser()
        robots_url = f"https://{domain}/robots.txt"
        try:
            response = await self._client.get(robots_url, headers=policy.as_headers(), timeout=10.0)
            if response.status_code >= 400:
                self._robots[domain] = None
                return None
            parser.parse(response.text.splitlines())
            self._robots[domain] = parser
            return parser
        except httpx.HTTPError:
            self._robots[domain] = None
            return None

    async def _allowed(self, url: str, policy: SitePolitenessPolicy, domain: str) -> bool:
        if not policy.respect_robots:
            return True
        parser = await self._load_robots(domain, policy)
        if not parser:
            return True
        return parser.can_fetch(policy.user_agent, url)

    async def request(self, method: str, url: str, **kwargs):
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        policy = self._policy_for(domain)

        if not await self._allowed(url, policy, domain):
            raise PermissionError(f"Robots policy for {domain} disallows {url}")

        await self._wait_for_slot(domain, policy)

        headers = kwargs.pop("headers", {}) or {}
        merged_headers = {**policy.as_headers(), **headers}
        max_attempts = max(1, policy.max_attempts)

        for attempt in range(1, max_attempts + 1):
            try:
                response = await self._client.request(method, url, headers=merged_headers, **kwargs)
                response.raise_for_status()
                self._last_request[domain] = time.monotonic()
                return response
            except httpx.HTTPError as exc:
                if attempt >= max_attempts:
                    raise
                backoff = min(5.0, policy.backoff_factor * (2 ** (attempt - 1)))
                jitter = random.uniform(0, policy.delay_seconds)
                await asyncio.sleep(backoff + jitter)
                last = getattr(exc, "response", None)
                if last is not None and last.status_code in {401, 403}:
                    raise

    async def get(self, url: str, **kwargs):
        return await self.request("GET", url, **kwargs)

    async def post(self, url: str, **kwargs):
        return await self.request("POST", url, **kwargs)

