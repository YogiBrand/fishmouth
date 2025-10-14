from __future__ import annotations

import asyncio
import colorsys
import logging
import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from io import BytesIO
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import httpx
import numpy as np
from PIL import Image, ImageColor, ImageDraw, ImageFilter

from config import get_settings
from services.ai.roof_analyzer import RoofAnalysisResult, analyze_roof
from services.providers.imagery_provider import ImageryProvider
from services.providers.property_enrichment import PropertyProfile
from services.resilience import AsyncRateLimiter
from storage import hashed_filename, save_binary


logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class ImageryQualityReport:
    overall_score: float
    metrics: Dict[str, float]
    issues: List[str]


@dataclass
class ImageryAsset:
    raw_bytes: bytes
    public_url: str
    source: str
    captured_at: datetime
    resolution: Tuple[int, int]
    quality: ImageryQualityReport
    storage_path: str


@dataclass
class NormalizedRoofView:
    image_bytes: bytes
    mask_bytes: bytes
    rotation_degrees: float
    coverage_ratio: float
    bounding_box: Tuple[int, int, int, int]
    width: int
    height: int
    image_path: Optional[str] = None
    image_url: Optional[str] = None
    mask_path: Optional[str] = None
    mask_url: Optional[str] = None


@dataclass
class RoofAnomaly:
    type: str
    severity: float
    probability: float
    description: str
    coverage_sqft: float
    color: Optional[str] = None
    mask_bytes: Optional[bytes] = None
    mask_path: Optional[str] = None
    mask_url: Optional[str] = None


@dataclass
class AnomalyBundle:
    anomalies: List[RoofAnomaly]
    heatmap_bytes: Optional[bytes]
    heatmap_path: Optional[str] = None
    heatmap_url: Optional[str] = None
    legend: Dict[str, str] = field(default_factory=dict)


@dataclass
class StreetViewAsset:
    heading: float
    pitch: float
    fov: float
    source: str
    captured_at: datetime
    distance_m: float
    occlusion_score: float
    quality_score: float
    anomalies: List[RoofAnomaly]
    public_url: str
    storage_path: str
    raw_bytes: bytes


@dataclass
class EnhancedRoofAnalysisResult:
    roof_analysis: RoofAnalysisResult
    imagery: ImageryAsset
    normalized_view: NormalizedRoofView
    anomaly_bundle: AnomalyBundle
    street_view_assets: List[StreetViewAsset]
    dossier: Dict[str, Any] = field(default_factory=dict)


def _rgb_to_hsv(np_rgb: np.ndarray) -> np.ndarray:
    flat = np_rgb.reshape(-1, 3)
    hsv_list = [colorsys.rgb_to_hsv(*pixel.tolist()) for pixel in flat]
    return np.array(hsv_list, dtype=np.float32).reshape(np_rgb.shape)


class ImageryAutopilot:
    """Harvest satellite tiles from multiple providers/zooms and score quality."""

    ZOOM_LEVELS = (20, 19, 18)

    def __init__(self) -> None:
        self._provider = ImageryProvider()

    async def capture(self, latitude: float, longitude: float, dossier_id: str) -> ImageryAsset:
        candidates: List[ImageryAsset] = []
        for zoom in self.ZOOM_LEVELS:
            candidates.extend(
                await self._capture_zoom(latitude, longitude, dossier_id, zoom)
            )

        if not candidates:
            logger.warning("No live imagery candidates; falling back to provider placeholder")
            fallback = await self._provider.fetch(latitude, longitude, zoom=18)
            quality = self._evaluate_quality(fallback.raw_bytes)
            filename = f"{dossier_id}/satellite/zoom18-{fallback.source}.jpg"
            public_url = save_binary(fallback.raw_bytes, filename, content_type="image/jpeg")
            return ImageryAsset(
                raw_bytes=fallback.raw_bytes,
                public_url=public_url,
                source=fallback.source,
                captured_at=fallback.captured_at,
                resolution=fallback.resolution,
                quality=quality,
                storage_path=filename,
            )

        best = max(candidates, key=lambda asset: asset.quality.overall_score)
        return best

    async def _capture_zoom(
        self,
        latitude: float,
        longitude: float,
        dossier_id: str,
        zoom: int,
    ) -> List[ImageryAsset]:
        assets: List[ImageryAsset] = []
        # Try Mapbox and Google independently to choose the sharpest tile.
        mapbox_bytes = await self._provider._fetch_mapbox(latitude, longitude, zoom)
        if mapbox_bytes:
            assets.append(self._build_asset(mapbox_bytes, "mapbox", dossier_id, zoom))

        google_bytes = await self._provider._fetch_google(latitude, longitude, zoom)
        if google_bytes:
            assets.append(self._build_asset(google_bytes, "google_static", dossier_id, zoom))

        if not assets and settings.feature_flags.use_mock_imagery:
            placeholder = self._provider._generate_placeholder(latitude, longitude)
            assets.append(self._build_asset(placeholder, "generated", dossier_id, zoom))
        return assets

    def _build_asset(self, image_bytes: bytes, source: str, dossier_id: str, zoom: int) -> ImageryAsset:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        quality = self._evaluate_quality(image_bytes)
        filename = f"{dossier_id}/satellite/zoom{zoom}-{source}.jpg"
        public_url = save_binary(image_bytes, filename, content_type="image/jpeg")
        return ImageryAsset(
            raw_bytes=image_bytes,
            public_url=public_url,
            source=source,
            captured_at=datetime.now(timezone.utc),
            resolution=image.size,
            quality=quality,
            storage_path=filename,
        )

    def _evaluate_quality(self, image_bytes: bytes) -> ImageryQualityReport:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        np_image = np.asarray(image, dtype=np.float32) / 255.0
        gray = np.mean(np_image, axis=2)

        contrast = float(np.std(gray))
        brightness = float(np.mean(gray))
        gy, gx = np.gradient(gray)
        laplacian = np.gradient(gx, axis=1) + np.gradient(gy, axis=0)
        sharpness = float(np.var(laplacian))
        shadow_ratio = float(np.mean(gray < 0.17))
        highlight_ratio = float(np.mean(gray > 0.93))

        hsv = _rgb_to_hsv(np_image)
        cloudiness = float(np.mean((hsv[:, :, 2] > 0.82) & (hsv[:, :, 1] < 0.08)))
        roof_edges = np.hypot(gx, gy)
        roof_visibility = float(np.mean(roof_edges > 0.12))

        issues: List[str] = []
        if min(image.size) < 800:
            issues.append("resolution_below_target")
        if brightness < 0.22:
            issues.append("too_dark")
        if brightness > 0.82:
            issues.append("too_bright")
        if contrast < 0.06:
            issues.append("low_contrast")
        if sharpness < 0.002:
            issues.append("soft_focus")
        if shadow_ratio > 0.28:
            issues.append("heavy_shadows")
        if cloudiness > 0.15:
            issues.append("cloud_cover")
        if roof_visibility < 0.1:
            issues.append("poor_roof_visibility")

        score = (
            (min(image.size) / 1200.0) * 24.0
            + (1.0 - abs(brightness - 0.52)) * 22.0
            + min(contrast * 260.0, 20.0)
            + min(sharpness * 900.0, 16.0)
            + (1.0 - min(shadow_ratio, 0.45)) * 9.0
            + (1.0 - min(cloudiness, 0.45)) * 9.0
            + min(roof_visibility * 55.0, 20.0)
        )
        score = float(np.clip(score, 5.0, 100.0))

        metrics = {
            "brightness": round(brightness, 3),
            "contrast": round(contrast, 3),
            "sharpness": round(sharpness, 4),
            "shadow_ratio": round(shadow_ratio, 3),
            "highlight_ratio": round(highlight_ratio, 3),
            "cloudiness": round(cloudiness, 3),
            "roof_visibility": round(roof_visibility, 3),
            "width": image.size[0],
            "height": image.size[1],
        }

        return ImageryQualityReport(overall_score=round(score, 1), metrics=metrics, issues=issues)

    async def aclose(self) -> None:
        await self._provider.aclose()


class RoofSegmentationService:
    """Creates roof masks and normalized top-down crops."""

    def generate(self, asset: ImageryAsset) -> NormalizedRoofView:
        image = Image.open(BytesIO(asset.raw_bytes)).convert("RGB")
        np_image = np.asarray(image, dtype=np.float32) / 255.0
        hsv = _rgb_to_hsv(np_image)
        value = hsv[:, :, 2]
        saturation = hsv[:, :, 1]

        roof_mask = (value > 0.25) & (value < 0.92) & (saturation < 0.56)
        roof_mask = self._refine_mask(roof_mask)

        coords = np.argwhere(roof_mask)
        if coords.size == 0:
            logger.warning("Roof segmentation failed; using central crop fallback")
            mask_image = Image.new("L", image.size, 0)
            draw = ImageDraw.Draw(mask_image)
            width, height = image.size
            draw.rectangle(
                (width * 0.22, height * 0.22, width * 0.78, height * 0.78),
                fill=255,
            )
            roof_mask = np.asarray(mask_image) > 0
            coords = np.argwhere(roof_mask)

        rotation = self._estimate_rotation(coords)

        rotated_image = image.rotate(rotation, resample=Image.BICUBIC, expand=True)
        mask_image = Image.fromarray((roof_mask.astype(np.uint8) * 255))
        rotated_mask = mask_image.rotate(rotation, resample=Image.NEAREST, expand=True)

        bbox = rotated_mask.getbbox() or (0, 0, rotated_mask.width, rotated_mask.height)
        cropped_image = rotated_image.crop(bbox)
        cropped_mask = rotated_mask.crop(bbox)

        coverage_ratio = float(np.mean(np.asarray(cropped_mask) > 0))
        normalized_image = cropped_image.resize((768, 768), resample=Image.BICUBIC)
        normalized_mask = cropped_mask.resize((768, 768), resample=Image.NEAREST)

        image_buffer = BytesIO()
        normalized_image.save(image_buffer, format="JPEG", quality=92)
        mask_buffer = BytesIO()
        normalized_mask.save(mask_buffer, format="PNG")

        return NormalizedRoofView(
            image_bytes=image_buffer.getvalue(),
            mask_bytes=mask_buffer.getvalue(),
            rotation_degrees=rotation,
            coverage_ratio=coverage_ratio,
            bounding_box=bbox,
            width=normalized_image.width,
            height=normalized_image.height,
        )

    def _refine_mask(self, mask: np.ndarray) -> np.ndarray:
        mask_img = Image.fromarray((mask.astype(np.uint8) * 255))
        mask_img = mask_img.filter(ImageFilter.MedianFilter(size=5))
        mask_img = mask_img.filter(ImageFilter.MaxFilter(size=5))
        mask_img = mask_img.filter(ImageFilter.MinFilter(size=3))
        return np.asarray(mask_img) > 0

    def _estimate_rotation(self, coords: np.ndarray) -> float:
        centered = coords - coords.mean(axis=0)
        covariance = np.cov(centered, rowvar=False)
        eigenvalues, eigenvectors = np.linalg.eigh(covariance)
        principal_vector = eigenvectors[:, np.argmax(eigenvalues)]
        angle = math.degrees(math.atan2(principal_vector[1], principal_vector[0]))
        return -angle


class RoofAnomalyDetector:
    """Detects discoloration and generates overlays."""

    COLOR_MAP = {
        "discoloration": "#ff7f0e",
        "dark_streaks": "#1f77b4",
        "moss_growth": "#2ca02c",
        "granule_loss": "#9467bd",
        "missing_shingles": "#d62728",
    }

    def detect(self, normalized_view: NormalizedRoofView, property_profile: PropertyProfile) -> AnomalyBundle:
        image = Image.open(BytesIO(normalized_view.image_bytes)).convert("RGB")
        mask = Image.open(BytesIO(normalized_view.mask_bytes)).convert("L")
        np_image = np.asarray(image, dtype=np.float32) / 255.0
        np_mask = (np.asarray(mask) > 0).astype(np.float32)
        hsv = _rgb_to_hsv(np_image)

        value = hsv[:, :, 2]
        saturation = hsv[:, :, 1]

        mask_pixels = np_mask.sum()
        if mask_pixels == 0:
            logger.warning("Normalized mask empty during anomaly detection")
            mask_pixels = 1.0

        base_value = np.mean(value[np_mask > 0])
        base_saturation = np.mean(saturation[np_mask > 0])

        dark_streaks = ((value < base_value * 0.86) & (np_mask > 0)).astype(np.uint8)
        moss = (
            (saturation > base_saturation * 1.18)
            & (value < base_value * 0.94)
            & (np_mask > 0)
        ).astype(np.uint8)
        bright_mask = ((value > base_value * 1.12) & (np_mask > 0)).astype(np.uint8)

        gray = np.mean(np_image, axis=2)
        gradient_mag = np.hypot(*np.gradient(gray))
        texture_loss = ((gradient_mag < 0.11) & (np_mask > 0)).astype(np.uint8)

        overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
        draw = ImageDraw.Draw(overlay, "RGBA")
        anomalies: List[RoofAnomaly] = []

        def register(anomaly_type: str, mask_array: np.ndarray, severity_multiplier: float) -> None:
            if mask_array.sum() == 0:
                return
            coverage_ratio = mask_array.sum() / mask_pixels
            severity = min(0.25 + coverage_ratio * severity_multiplier, 1.0)
            probability = min(0.58 + coverage_ratio * 1.9, 0.98)
            color = self.COLOR_MAP.get(anomaly_type, "#ff0000")
            alpha = int(min(220, 120 + severity * 140))
            mask_img = Image.fromarray((mask_array * 255).astype(np.uint8))
            overlay_draw = Image.new("RGBA", mask_img.size, (0, 0, 0, 0))
            overlay_draw_array = overlay_draw.load()
            mask_pixels_coords = mask_img.load()
            for y in range(mask_img.size[1]):
                for x in range(mask_img.size[0]):
                    if mask_pixels_coords[x, y] > 0:
                        overlay_draw_array[x, y] = ImageColor.getrgb(color) + (alpha,)
            overlay.alpha_composite(overlay_draw)

            mask_bytes = BytesIO()
            mask_img.save(mask_bytes, format="PNG")

            coverage_sqft = self._estimate_coverage_sqft(coverage_ratio, property_profile)
            anomalies.append(
                RoofAnomaly(
                    type=anomaly_type,
                    severity=round(severity, 2),
                    probability=round(probability, 2),
                    description=self._describe(anomaly_type, severity, coverage_sqft),
                    coverage_sqft=round(coverage_sqft, 1),
                    color=color,
                    mask_bytes=mask_bytes.getvalue(),
                )
            )

        register("dark_streaks", dark_streaks, 3.3)
        register("moss_growth", moss, 2.9)
        register("granule_loss", texture_loss * (1 - moss), 2.2)
        register("discoloration", bright_mask, 2.6)

        heatmap_buffer = BytesIO()
        overlay.save(heatmap_buffer, format="PNG")

        legend = {anomaly.type: anomaly.color or "#ff0000" for anomaly in anomalies}
        return AnomalyBundle(
            anomalies=anomalies,
            heatmap_bytes=heatmap_buffer.getvalue() if anomalies else None,
            legend=legend,
        )

    def _estimate_coverage_sqft(self, ratio: float, profile: PropertyProfile) -> float:
        base_sqft = profile.square_feet or profile.lot_size_sqft or 2400
        return base_sqft * ratio * 0.55

    def _describe(self, anomaly_type: str, severity: float, coverage_sqft: float) -> str:
        descriptors = {
            "dark_streaks": "Black streaking consistent with algae growth.",
            "moss_growth": "Elevated saturation indicates moss or lichen patches.",
            "granule_loss": "Texture attenuation suggests granule loss.",
            "discoloration": "Color shift implies weathering or patchwork repairs.",
        }
        tier = "severe" if severity > 0.75 else "moderate" if severity > 0.45 else "notable"
        base = descriptors.get(anomaly_type, "Surface anomaly observed.")
        return f"{base} Coverage ~{coverage_sqft:.0f} sqft; {tier} severity."


class StreetViewCollector:
    """Captures validated multi-angle Street View imagery."""

    HEADINGS = (0, 45, 90, 135, 180, 225, 270, 315)

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=settings.http_timeout_seconds)
        resilience = settings.pipeline_resilience
        self._rate_limiter = AsyncRateLimiter(resilience.imagery_requests_per_minute, 60.0)

    async def collect(
        self,
        latitude: float,
        longitude: float,
        dossier_id: str,
        max_angles: int = 3,
    ) -> List[StreetViewAsset]:
        if not settings.providers.google_maps_api_key or settings.feature_flags.use_mock_imagery:
            return []

        assets: List[StreetViewAsset] = []
        for heading in self.HEADINGS:
            asset = await self._fetch_angle(latitude, longitude, heading, dossier_id)
            if asset:
                assets.append(asset)

        if not assets:
            return []

        assets.sort(key=lambda a: (a.quality_score, -a.occlusion_score), reverse=True)
        chosen: List[StreetViewAsset] = []
        used_headings: List[float] = []
        for asset in assets:
            if len(chosen) >= max_angles:
                break
            if any(abs(asset.heading - used) < 30 for used in used_headings):
                continue
            chosen.append(asset)
            used_headings.append(asset.heading)
        return chosen

    async def _fetch_angle(
        self,
        latitude: float,
        longitude: float,
        heading: float,
        dossier_id: str,
        pitch: float = -5.0,
        fov: float = 80.0,
    ) -> Optional[StreetViewAsset]:

        params = {
            "location": f"{latitude},{longitude}",
            "heading": str(heading),
            "pitch": str(pitch),
            "fov": str(fov),
            "source": "outdoor",
            "key": settings.providers.google_maps_api_key,
        }
        metadata_url = "https://maps.googleapis.com/maps/api/streetview/metadata"
        async with self._rate_limiter:
            meta_resp = await self._client.get(metadata_url, params=params)
        try:
            meta_resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.debug("Street View metadata failed for heading %s: %s", heading, exc)
            return None
        meta = meta_resp.json()
        if meta.get("status") != "OK":
            return None

        pano_loc = meta.get("location") or {}
        pano_lat = pano_loc.get("lat")
        pano_lng = pano_loc.get("lng")
        if pano_lat is None or pano_lng is None:
            return None

        distance_m = self._haversine(latitude, longitude, pano_lat, pano_lng) * 1000.0
        if distance_m > 45.0:
            return None

        image_url = "https://maps.googleapis.com/maps/api/streetview"
        image_params = dict(params)
        image_params["size"] = "1200x800"

        async with self._rate_limiter:
            image_resp = await self._client.get(image_url, params=image_params)

        try:
            image_resp.raise_for_status()
        except httpx.HTTPStatusError as exc:
            logger.debug("Street View image failed for heading %s: %s", heading, exc)
            return None

        image_bytes = image_resp.content
        occlusion, quality = self._score_street_view(image_bytes)

        filename = f"{dossier_id}/streetview/{heading:.0f}.jpg"
        public_url = save_binary(image_bytes, filename, content_type="image/jpeg")

        anomalies = self._detect_street_view_anomalies(image_bytes)

        return StreetViewAsset(
            heading=heading,
            pitch=pitch,
            fov=fov,
            source="google_street_view",
            captured_at=datetime.now(timezone.utc),
            distance_m=round(distance_m, 2),
            occlusion_score=round(occlusion, 3),
            quality_score=round(quality, 3),
            anomalies=anomalies,
            public_url=public_url,
            storage_path=filename,
            raw_bytes=image_bytes,
        )

    def _score_street_view(self, image_bytes: bytes) -> Tuple[float, float]:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        np_image = np.asarray(image, dtype=np.float32) / 255.0
        gray = np.mean(np_image, axis=2)
        brightness = float(np.mean(gray))
        contrast = float(np.std(gray))

        green_ratio = float(np.mean(np_image[:, :, 1] > 0.45))
        sky_ratio = float(np.mean((np_image[:, :, 2] > 0.78) & (np_image[:, :, 2] > np_image[:, :, 0])))

        occlusion = min(1.0, green_ratio * 1.35 + sky_ratio * 0.55)
        quality = (
            (1.0 - abs(brightness - 0.52)) * 0.4
            + min(contrast * 5.0, 0.4)
            + (1.0 - occlusion) * 0.2
        )
        return occlusion, max(0.05, min(quality, 0.96))

    def _detect_street_view_anomalies(self, image_bytes: bytes) -> List[RoofAnomaly]:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        np_image = np.asarray(image, dtype=np.float32) / 255.0
        gray = np.mean(np_image, axis=2)
        edges = np.hypot(*np.gradient(gray))

        roof_band = gray[int(gray.shape[0] * 0.25) : int(gray.shape[0] * 0.65), :]
        edge_band = edges[int(edges.shape[0] * 0.25) : int(edges.shape[0] * 0.65), :]

        dark_ratio = float(np.mean(roof_band < 0.35))
        missing_ratio = float(np.mean(edge_band < 0.055))

        anomalies: List[RoofAnomaly] = []
        if dark_ratio > 0.18:
            anomalies.append(
                RoofAnomaly(
                    type="streetview_dark_streaks",
                    severity=round(min(1.0, dark_ratio * 2.0), 2),
                    probability=round(min(0.95, 0.55 + dark_ratio * 1.6), 2),
                    description="Street view reveals dark discoloration visible from curb.",
                    coverage_sqft=0.0,
                )
            )
        if missing_ratio > 0.12:
            anomalies.append(
                RoofAnomaly(
                    type="streetview_missing_shingles",
                    severity=round(min(1.0, missing_ratio * 2.4), 2),
                    probability=round(min(0.96, 0.5 + missing_ratio * 2.1), 2),
                    description="Potential missing or damaged shingles apparent in facade view.",
                    coverage_sqft=0.0,
                )
            )
        return anomalies

    async def aclose(self) -> None:
        await self._client.aclose()

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        a = (
            math.sin(delta_phi / 2) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        )
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class EnhancedRoofAnalysisPipeline:
    """Coordinates satellite capture, segmentation, anomaly detection, and street imagery."""

    def __init__(self) -> None:
        self._imagery_autopilot = ImageryAutopilot()
        self._segmentation = RoofSegmentationService()
        self._anomaly_detector = RoofAnomalyDetector()
        self._street_view = StreetViewCollector()

    async def analyze_roof_with_quality_control(
        self,
        property_id: str,
        latitude: float,
        longitude: float,
        property_profile: PropertyProfile,
        enable_street_view: bool = True,
    ) -> EnhancedRoofAnalysisResult:
        dossier_id = hashed_filename("dossier", property_id, f"{latitude:.5f}", f"{longitude:.5f}", suffix="")

        imagery_asset = await self._imagery_autopilot.capture(latitude, longitude, dossier_id)

        normalized_view = self._segmentation.generate(imagery_asset)
        normalized_image_path = f"{dossier_id}/satellite/normalized.jpg"
        normalized_image_url = save_binary(
            normalized_view.image_bytes,
            normalized_image_path,
            content_type="image/jpeg",
        )
        normalized_mask_path = f"{dossier_id}/satellite/mask.png"
        normalized_mask_url = save_binary(
            normalized_view.mask_bytes,
            normalized_mask_path,
            content_type="image/png",
        )
        normalized_view.image_path = normalized_image_path
        normalized_view.image_url = normalized_image_url
        normalized_view.mask_path = normalized_mask_path
        normalized_view.mask_url = normalized_mask_url

        roof_analysis = analyze_roof(normalized_view.image_bytes, metadata=property_profile.__dict__)

        anomaly_bundle = self._anomaly_detector.detect(normalized_view, property_profile)
        if anomaly_bundle.heatmap_bytes:
            heatmap_path = f"{dossier_id}/satellite/heatmap.png"
            heatmap_url = save_binary(anomaly_bundle.heatmap_bytes, heatmap_path, content_type="image/png")
            anomaly_bundle.heatmap_path = heatmap_path
            anomaly_bundle.heatmap_url = heatmap_url
        for anomaly in anomaly_bundle.anomalies:
            if anomaly.mask_bytes:
                mask_path = f"{dossier_id}/satellite/anomaly-{anomaly.type}.png"
                mask_url = save_binary(anomaly.mask_bytes, mask_path, content_type="image/png")
                anomaly.mask_path = mask_path
                anomaly.mask_url = mask_url

        street_assets: List[StreetViewAsset] = []
        if enable_street_view:
            street_assets = await self._street_view.collect(latitude, longitude, dossier_id)

        dossier = self._build_dossier(
            property_id=property_id,
            imagery=imagery_asset,
            normalized_view=normalized_view,
            roof_analysis=roof_analysis,
            anomaly_bundle=anomaly_bundle,
            street_assets=street_assets,
        )

        return EnhancedRoofAnalysisResult(
            roof_analysis=roof_analysis,
            imagery=imagery_asset,
            normalized_view=normalized_view,
            anomaly_bundle=anomaly_bundle,
            street_view_assets=street_assets,
            dossier=dossier,
        )

    async def aclose(self) -> None:
        await asyncio.gather(
            self._imagery_autopilot.aclose(),
            self._street_view.aclose(),
        )

    def _build_dossier(
        self,
        property_id: str,
        imagery: ImageryAsset,
        normalized_view: NormalizedRoofView,
        roof_analysis: RoofAnalysisResult,
        anomaly_bundle: AnomalyBundle,
        street_assets: Sequence[StreetViewAsset],
    ) -> Dict[str, Any]:
        return {
            "property_id": property_id,
            "imagery": {
                "public_url": imagery.public_url,
                "storage_path": imagery.storage_path,
                "source": imagery.source,
                "captured_at": imagery.captured_at.isoformat(),
                "quality": {
                    "score": imagery.quality.overall_score,
                    "issues": imagery.quality.issues,
                    "metrics": imagery.quality.metrics,
                },
            },
            "roof_view": {
                "rotation_degrees": normalized_view.rotation_degrees,
                "coverage_ratio": normalized_view.coverage_ratio,
                "width": normalized_view.width,
                "height": normalized_view.height,
                "image_url": normalized_view.image_url,
                "mask_url": normalized_view.mask_url,
                "image_path": normalized_view.image_path,
                "mask_path": normalized_view.mask_path,
            },
            "analysis": {
                "summary": roof_analysis.summary,
                "condition_score": roof_analysis.condition_score,
                "damage_indicators": roof_analysis.damage_indicators,
                "metrics": roof_analysis.metrics,
                "confidence": roof_analysis.confidence,
                "replacement_urgency": roof_analysis.replacement_urgency,
            },
            "anomalies": [
                {
                    "type": anomaly.type,
                    "severity": anomaly.severity,
                    "probability": anomaly.probability,
                    "description": anomaly.description,
                    "coverage_sqft": anomaly.coverage_sqft,
                    "color": anomaly.color,
                    "mask_url": anomaly.mask_url,
                    "mask_path": anomaly.mask_path,
                }
                for anomaly in anomaly_bundle.anomalies
            ],
            "heatmap": {
                "url": anomaly_bundle.heatmap_url,
                "path": anomaly_bundle.heatmap_path,
                "legend": anomaly_bundle.legend,
            },
            "street_view": [
                {
                    "heading": asset.heading,
                    "pitch": asset.pitch,
                    "fov": asset.fov,
                    "distance_m": asset.distance_m,
                    "occlusion_score": asset.occlusion_score,
                    "quality_score": asset.quality_score,
                    "public_url": asset.public_url,
                    "storage_path": asset.storage_path,
                    "anomalies": [
                        {
                            "type": anomaly.type,
                            "severity": anomaly.severity,
                            "probability": anomaly.probability,
                            "description": anomaly.description,
                        }
                        for anomaly in asset.anomalies
                    ],
                }
                for asset in street_assets
            ],
        }
