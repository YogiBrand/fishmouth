"""Imagery provider chain with caching, quality scoring, and budget caps."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, date, timezone
from io import BytesIO
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import httpx
from PIL import Image, ImageDraw, ImageFont, ImageStat

from config import get_settings
from storage import hashed_filename, save_binary

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class TileResult:
    provider: str
    url: str
    quality: float
    cost_cents: int
    cached: bool
    captured_at: datetime
    metadata: Dict[str, object]


class TileCache:
    """Simple persistent cache for fetched imagery tiles."""

    def __init__(self) -> None:
        self._root = Path(settings.storage.storage_root)
        self._root.mkdir(parents=True, exist_ok=True)

    def _paths(self, provider: str, lat: float, lon: float, zoom: int) -> Tuple[Path, Path]:
        filename = hashed_filename(
            f"tile-{provider}",
            f"{zoom}",
            f"{lat:.5f}",
            f"{lon:.5f}",
            suffix=".jpg",
        )
        path = self._root / filename
        meta_path = path.with_suffix(".json")
        path.parent.mkdir(parents=True, exist_ok=True)
        return path, meta_path

    def get(self, provider: str, lat: float, lon: float, zoom: int) -> Optional[Tuple[bytes, Dict[str, object]]]:
        path, meta_path = self._paths(provider, lat, lon, zoom)
        if not path.exists() or not meta_path.exists():
            return None
        try:
            data = path.read_bytes()
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            return data, meta
        except Exception:  # noqa: BLE001
            return None

    def save(
        self,
        provider: str,
        lat: float,
        lon: float,
        zoom: int,
        data: bytes,
        quality: float,
        cost_cents: int,
        meta_extra: Optional[Dict[str, object]] = None,
    ) -> TileResult:
        path, meta_path = self._paths(provider, lat, lon, zoom)
        url = save_binary(data, path.name, content_type="image/jpeg")
        meta = {
            "provider": provider,
            "quality": quality,
            "cost_cents": cost_cents,
            "captured_at": datetime.utcnow().isoformat(),
            "url": url,
        }
        if meta_extra:
            meta.update(meta_extra)
        meta_path.write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
        return TileResult(
            provider=provider,
            url=url,
            quality=quality,
            cost_cents=cost_cents,
            cached=False,
            captured_at=datetime.utcnow(),
            metadata=meta,
        )


class DailyBudgetLedger:
    """Tracks per-provider daily spend to enforce caps."""

    def __init__(self, path: Optional[Path] = None) -> None:
        self._path = path or (Path("uploads") / "imagery_budget_ledger.json")
        self._path.parent.mkdir(parents=True, exist_ok=True)

    def _load(self) -> Dict[str, Dict[str, Dict[str, int]]]:
        if not self._path.exists():
            return {}
        try:
            return json.loads(self._path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return {}

    def _store(self, payload: Dict[str, Dict[str, Dict[str, int]]]) -> None:
        self._path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    def spent_today(self, provider: str) -> int:
        data = self._load()
        today = date.today().isoformat()
        return data.get(today, {}).get(provider, {}).get("spent_cents", 0)

    def record(self, provider: str, cost_cents: int) -> None:
        data = self._load()
        today = date.today().isoformat()
        provider_entry = data.setdefault(today, {}).setdefault(provider, {"spent_cents": 0, "requests": 0})
        provider_entry["spent_cents"] += int(cost_cents)
        provider_entry["requests"] += 1
        self._store(data)


def _evaluate_quality(image_bytes: bytes) -> float:
    """Return a 0..1 quality estimate based on brightness/variance heuristics."""

    try:
        with Image.open(BytesIO(image_bytes)) as img:
            grayscale = img.convert("L")
            stat = ImageStat.Stat(grayscale)
            mean = stat.mean[0]
            variance = stat.var[0]
            brightness_score = min(1.0, max(0.0, mean / 200.0))
            variance_score = min(1.0, variance / 5000.0)
            quality = 0.35 * brightness_score + 0.65 * variance_score
            return round(float(quality), 4)
    except Exception:  # noqa: BLE001
        return 0.0


class BaseProvider:
    name = "base"
    cost_cents: int = 0

    async def fetch_tile(self, lat: float, lon: float, zoom: int) -> Optional[bytes]:
        raise NotImplementedError


class NAIPProvider(BaseProvider):
    name = "naip"
    cost_cents = 0

    async def fetch_tile(self, lat: float, lon: float, zoom: int) -> Optional[bytes]:
        # Synthetic gradient tile approximating low-cost NAIP imagery.
        img = Image.new("RGB", (512, 512), color=(44, 75, 99))
        draw = ImageDraw.Draw(img)
        gradient_color = int((abs(lat) + abs(lon)) % 255)
        for y in range(512):
            shade = int(gradient_color * (y / 512))
            draw.line([(0, y), (512, y)], fill=(30 + shade, 60 + shade // 2, 40 + shade // 3))
        draw.rectangle([(0, 0), (511, 511)], outline=(255, 255, 255), width=2)
        text = f"NAIP\n{lat:.4f}, {lon:.4f}\nzoom {zoom}"
        try:
            font = ImageFont.truetype("DejaVuSans.ttf", 20)
        except OSError:
            font = ImageFont.load_default()
        draw.multiline_text((16, 16), text, fill=(240, 240, 240), font=font)

        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=90)
        return buffer.getvalue()


class MapboxProvider(BaseProvider):
    name = "mapbox"
    cost_cents = 12  # ~ $0.12 per thousand requests => 0.012 each -> 1.2 cents; scale up for rounding.

    def __init__(self, client: httpx.AsyncClient, token: Optional[str]) -> None:
        self._client = client
        self._token = token

    async def fetch_tile(self, lat: float, lon: float, zoom: int) -> Optional[bytes]:
        if not self._token:
            return None
        url = (
            f"https://api.mapbox.com/styles/v1/mapbox/satellite-v9/static/"
            f"{lon},{lat},{zoom},0/1024x1024@2x?access_token={self._token}"
        )
        try:
            response = await self._client.get(url)
            response.raise_for_status()
            return response.content
        except httpx.HTTPError as exc:  # pragma: no cover - network defensive
            logger.warning("mapbox.fetch.failed", extra={"error": str(exc), "lat": lat, "lon": lon})
            return None


class GoogleStaticProvider(BaseProvider):
    name = "google"
    cost_cents = 20

    def __init__(self, client: httpx.AsyncClient, api_key: Optional[str]) -> None:
        self._client = client
        self._api_key = api_key

    async def fetch_tile(self, lat: float, lon: float, zoom: int) -> Optional[bytes]:
        if not self._api_key:
            return None
        params = {
            "center": f"{lat},{lon}",
            "zoom": str(zoom),
            "size": "640x640",
            "maptype": "satellite",
            "key": self._api_key,
        }
        try:
            response = await self._client.get("https://maps.googleapis.com/maps/api/staticmap", params=params)
            response.raise_for_status()
            return response.content
        except httpx.HTTPError as exc:  # pragma: no cover - network defensive
            logger.warning("google.fetch.failed", extra={"error": str(exc), "lat": lat, "lon": lon})
            return None


class PlaceholderProvider(BaseProvider):
    name = "placeholder"
    cost_cents = 0

    async def fetch_tile(self, lat: float, lon: float, zoom: int) -> Optional[bytes]:
        img = Image.new("RGB", (512, 512), color=(24, 32, 42))
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("DejaVuSans.ttf", 18)
        except OSError:
            font = ImageFont.load_default()
        draw.multiline_text(
            (40, 180),
            f"No imagery\n{lat:.4f}, {lon:.4f}\nzoom {zoom}",
            fill=(220, 220, 220),
            font=font,
            align="center",
        )
        buffer = BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        return buffer.getvalue()


class ProviderChain:
    """Coordinate lowest-cost provider selection with caching and budgets."""

    DEFAULT_ORDER: List[str] = ["naip", "mapbox", "google"]
    DEFAULT_DAILY_CAPS: Dict[str, int] = {"mapbox": 5_000, "google": 10_000}

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=settings.http_timeout_seconds)
        self._providers: Dict[str, BaseProvider] = {}
        self._tile_cache = TileCache()
        self._ledger = DailyBudgetLedger()

    async def aclose(self) -> None:
        await self._client.aclose()

    def _provider(self, name: str) -> BaseProvider:
        if name in self._providers:
            return self._providers[name]

        if name == "naip":
            provider = NAIPProvider()
        elif name == "mapbox":
            provider = MapboxProvider(self._client, settings.providers.mapbox_token)
        elif name in {"google", "google_static"}:
            provider = GoogleStaticProvider(self._client, settings.providers.google_maps_api_key)
            provider.name = "google"
        elif name == "placeholder":
            provider = PlaceholderProvider()
        else:
            raise ValueError(f"Unsupported imagery provider '{name}'")
        self._providers[name] = provider
        return provider

    async def fetch(
        self,
        lat: float,
        lon: float,
        *,
        zoom: int,
        policy: Optional[Dict[str, object]] = None,
        job_budget_cents: Optional[int] = None,
        job_budget_consumer: Optional[callable] = None,
    ) -> Optional[TileResult]:
        policy = policy or {}
        order = [provider.lower() for provider in policy.get("order", self.DEFAULT_ORDER)]
        quality_threshold = float(policy.get("qualityThreshold", 0.4))
        per_provider_caps: Dict[str, int] = {
            key.lower(): int(value) for key, value in (policy.get("perProviderCaps") or {}).items()
        }
        daily_caps = {**self.DEFAULT_DAILY_CAPS}
        for key, value in (policy.get("dailyCaps") or {}).items():
            daily_caps[key.lower()] = int(value)

        for provider_name in order:
            provider = self._provider(provider_name)
            daily_cap = daily_caps.get(provider.name, daily_caps.get(provider_name))
            spent_today = self._ledger.spent_today(provider.name)
            if daily_cap is not None and spent_today >= daily_cap:
                logger.info(
                    "imagery.daily_cap.reached",
                    extra={"provider": provider.name, "lat": lat, "lon": lon, "cap": daily_cap},
                )
                continue

            remaining_for_provider = per_provider_caps.get(provider.name)
            if remaining_for_provider is not None and remaining_for_provider <= 0:
                continue

            cached_entry = self._tile_cache.get(provider.name, lat, lon, zoom)
            if cached_entry:
                data, meta = cached_entry
                quality = float(meta.get("quality", 0.5))
                if quality >= quality_threshold or provider_name == order[-1]:
                    captured_at = datetime.fromisoformat(meta.get("captured_at")) if meta.get("captured_at") else datetime.utcnow()
                    return TileResult(
                        provider=provider.name,
                        url=meta.get("url", ""),
                        quality=quality,
                        cost_cents=0,
                        cached=True,
                        captured_at=captured_at,
                        metadata=meta,
                    )

            if job_budget_cents is not None and provider.cost_cents > job_budget_cents:
                continue

            if remaining_for_provider is not None and provider.cost_cents > remaining_for_provider:
                continue

            if (
                not settings.feature_flags.use_mock_imagery
                or provider.name in {"naip", "placeholder"}
            ):
                data = await provider.fetch_tile(lat, lon, zoom)
            else:
                data = await provider.fetch_tile(lat, lon, zoom)

            if not data:
                continue

            quality = _evaluate_quality(data)
            result = self._tile_cache.save(
                provider.name,
                lat,
                lon,
                zoom,
                data,
                quality,
                provider.cost_cents,
                meta_extra={"zoom": zoom},
            )

            if provider.cost_cents:
                if job_budget_consumer:
                    job_budget_consumer(provider.cost_cents)
                self._ledger.record(provider.name, provider.cost_cents)
                if remaining_for_provider is not None:
                    per_provider_caps[provider.name] = max(0, remaining_for_provider - provider.cost_cents)
                if job_budget_cents is not None:
                    job_budget_cents = max(0, job_budget_cents - provider.cost_cents)

            if quality >= quality_threshold or provider_name == order[-1]:
                return result

        placeholder = await self._provider("placeholder").fetch_tile(lat, lon, zoom)
        if not placeholder:
            return None
        quality = _evaluate_quality(placeholder)
        return self._tile_cache.save(
            "placeholder",
            lat,
            lon,
            zoom,
            placeholder,
            quality,
            0,
            meta_extra={"zoom": zoom, "note": "fallback"},
        )
