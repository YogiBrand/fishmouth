"""Celery helper to fetch a single imagery tile and return metadata."""

from __future__ import annotations

import asyncio
from typing import Dict, Optional

from celery import shared_task

from services.imagery.providers import ProviderChain


@shared_task(bind=True, name="imagery.fetch_tile")
def fetch_and_store_tile(self, lat: float, lon: float, zoom: int = 18, provider: Optional[str] = None) -> Dict[str, object]:
    """Fetch a tile via ProviderChain and return its metadata (URL, quality, cost)."""

    async def _fetch() -> Optional[Dict[str, object]]:
        chain = ProviderChain()
        try:
            policy = {"order": [provider]} if provider else None
            result = await chain.fetch(lat, lon, zoom=zoom, policy=policy)
            if not result:
                return None
            return {
                "provider": result.provider,
                "quality": result.quality,
                "url": result.url,
                "cached": result.cached,
                "cost_cents": result.cost_cents,
                "captured_at": result.captured_at.isoformat(),
            }
        finally:
            await chain.aclose()

    payload = asyncio.run(_fetch())
    if not payload:
        return {"lat": lat, "lon": lon, "status": "skipped"}
    return {"lat": lat, "lon": lon, **payload, "status": "ok"}
