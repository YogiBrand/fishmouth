import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Optional

import httpx
from PIL import Image, ImageDraw, ImageFont

from config import get_settings
from services.resilience import AsyncRateLimiter, CircuitBreaker
from storage import save_binary, hashed_filename


settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class ImageryResult:
    image_path: Optional[Path]
    public_url: str
    source: str
    captured_at: datetime
    resolution: tuple[int, int]
    raw_bytes: bytes


class ImageryProvider:
    """Fetches high-quality aerial imagery for a latitude/longitude pair."""

    MAPBOX_STYLE = "mapbox/satellite-v9"

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=settings.http_timeout_seconds)
        resilience = settings.pipeline_resilience
        self._rate_limiter = AsyncRateLimiter(resilience.imagery_requests_per_minute, 60.0)
        self._mapbox_breaker = CircuitBreaker(
            "imagery.mapbox",
            failure_threshold=resilience.provider_failure_threshold,
            recovery_timeout=resilience.provider_recovery_seconds,
        )
        self._google_breaker = CircuitBreaker(
            "imagery.google_static",
            failure_threshold=resilience.provider_failure_threshold,
            recovery_timeout=resilience.provider_recovery_seconds,
        )
        self._retry_attempts = resilience.provider_retry_attempts

    async def fetch(self, latitude: float, longitude: float, zoom: int = 19) -> ImageryResult:
        """Fetch imagery, trying Mapbox first, falling back to Google Static Maps, then placeholder."""
        image_bytes: Optional[bytes] = None
        source = "generated"

        if not settings.feature_flags.use_mock_imagery:
            image_bytes = await self._fetch_mapbox(latitude, longitude, zoom)
            source = "mapbox" if image_bytes else source

        if image_bytes is None and not settings.feature_flags.use_mock_imagery:
            image_bytes = await self._fetch_google(latitude, longitude, zoom)
            source = "google_static" if image_bytes else source

        if image_bytes is None:
            image_bytes = self._generate_placeholder(latitude, longitude)
            source = "generated"

        image = Image.open(BytesIO(image_bytes))
        filename = hashed_filename("imagery", f"{latitude:.5f}", f"{longitude:.5f}", source, suffix=".jpg")
        public_url = save_binary(image_bytes, filename, content_type="image/jpeg")
        local_path = Path(settings.storage.storage_root) / filename
        if not local_path.exists():
            local_path = None

        return ImageryResult(
            image_path=local_path,
            public_url=public_url,
            source=source,
            captured_at=datetime.now(timezone.utc),
            resolution=image.size,
            raw_bytes=image_bytes,
        )

    async def _fetch_mapbox(self, latitude: float, longitude: float, zoom: int) -> Optional[bytes]:
        if not settings.providers.mapbox_token:
            return None
        if not self._mapbox_breaker.allow_call():
            logger.info(
                "Mapbox imagery circuit open; skipping request at lat=%s lon=%s",
                latitude,
                longitude,
            )
            return None
        url = (
            f"https://api.mapbox.com/styles/v1/{self.MAPBOX_STYLE}/static/"
            f"{longitude},{latitude},{zoom},0/1024x1024@2x"
            f"?access_token={settings.providers.mapbox_token}"
        )
        last_exc: Optional[Exception] = None
        for attempt in range(1, self._retry_attempts + 1):
            try:
                async with self._rate_limiter:
                    response = await self._client.get(url)
                response.raise_for_status()
                self._mapbox_breaker.record_success()
                return response.content
            except (httpx.HTTPError, httpx.RequestError) as exc:
                last_exc = exc
                logger.warning(
                    "Mapbox imagery attempt %s failed for lat=%s lon=%s: %s",
                    attempt,
                    latitude,
                    longitude,
                    exc,
                )
                await asyncio.sleep(self._retry_delay(attempt))
        self._mapbox_breaker.record_failure(str(last_exc) if last_exc else None)
        return None

    async def _fetch_google(self, latitude: float, longitude: float, zoom: int) -> Optional[bytes]:
        if not settings.providers.google_maps_api_key:
            return None
        if not self._google_breaker.allow_call():
            logger.info(
                "Google imagery circuit open; skipping request at lat=%s lon=%s",
                latitude,
                longitude,
            )
            return None
        params = {
            "center": f"{latitude},{longitude}",
            "zoom": str(zoom),
            "size": "640x640",
            "maptype": "satellite",
            "key": settings.providers.google_maps_api_key,
        }
        last_exc: Optional[Exception] = None
        for attempt in range(1, self._retry_attempts + 1):
            try:
                async with self._rate_limiter:
                    response = await self._client.get(
                        "https://maps.googleapis.com/maps/api/staticmap",
                        params=params,
                    )
                response.raise_for_status()
                self._google_breaker.record_success()
                return response.content
            except (httpx.HTTPError, httpx.RequestError) as exc:
                last_exc = exc
                logger.warning(
                    "Google imagery attempt %s failed for lat=%s lon=%s: %s",
                    attempt,
                    latitude,
                    longitude,
                    exc,
                )
                await asyncio.sleep(self._retry_delay(attempt))
        self._google_breaker.record_failure(str(last_exc) if last_exc else None)
        return None

    def _generate_placeholder(self, latitude: float, longitude: float) -> bytes:
        img = Image.new("RGB", (512, 512), color=(30, 64, 88))
        draw = ImageDraw.Draw(img)
        text = "Imagery unavailable\nlat: {:.4f}\nlon: {:.4f}".format(latitude, longitude)
        try:
            font = ImageFont.truetype("DejaVuSans.ttf", 18)
        except OSError:
            font = ImageFont.load_default()
        draw.multiline_text((40, 200), text, fill=(255, 255, 255), font=font, align="center")

        output = BytesIO()
        img.save(output, format="JPEG", quality=85)
        return output.getvalue()

    async def aclose(self) -> None:
        await self._client.aclose()

    def _retry_delay(self, attempt: int) -> float:
        base = 0.5 * (2 ** (attempt - 1))
        return min(base, 5.0)


async def fetch_imagery(latitude: float, longitude: float, zoom: int = 19) -> ImageryResult:
    provider = ImageryProvider()
    try:
        return await provider.fetch(latitude, longitude, zoom)
    finally:
        await provider.aclose()
