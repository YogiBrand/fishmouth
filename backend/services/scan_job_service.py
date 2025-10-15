"""Scan job creation and execution pipeline."""

from __future__ import annotations

import asyncio
import math
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from config import get_settings
from database import SessionLocal
from models import ScanJob
from services.imagery.providers import ProviderChain


def _point_in_polygon(lon: float, lat: float, polygon: Sequence[Sequence[float]]) -> bool:
    """Return True if point is inside polygon using ray casting algorithm."""

    if len(polygon) < 3:
        return False
    inside = False
    x = lon
    y = lat
    for i in range(len(polygon)):
        j = (i - 1) % len(polygon)
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        intersects = ((yi > y) != (yj > y)) and (
            x < (xj - xi) * (y - yi) / ((yj - yi) or 1e-9) + xi
        )
        if intersects:
            inside = not inside
    return inside


def _round_coord(value: float) -> float:
    return round(value, 6)


class ScanJobService:
    """Facade for creating and dispatching scan jobs."""

    def __init__(self, session) -> None:
        self.session = session

    def create_job(
        self,
        *,
        user_id: int,
        area_type: str,
        area_payload: Dict[str, Any],
        provider_policy: Dict[str, Any],
        filters: Optional[Dict[str, Any]] = None,
        enrichment_options: Optional[Dict[str, Any]] = None,
        budget_cents: int = 0,
    ) -> ScanJob:
        job = ScanJob(
            user_id=user_id,
            area_type=area_type,
            area_payload=area_payload,
            provider_policy=provider_policy or {},
            filters=filters or {},
            enrichment_options=enrichment_options or {},
            budget_cents=max(0, int(budget_cents or 0)),
            status="queued",
        )
        self.session.add(job)
        self.session.commit()
        self.session.refresh(job)
        return job

    def list_jobs(self, user_id: int, limit: int = 50) -> List[ScanJob]:
        return (
            self.session.query(ScanJob)
            .filter(ScanJob.user_id == user_id)
            .order_by(ScanJob.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_job(self, job_id: uuid.UUID, user_id: int) -> Optional[ScanJob]:
        job = self.session.get(ScanJob, job_id)
        if job and job.user_id == user_id:
            return job
        return None

    def dispatch_job(self, job_id: uuid.UUID) -> None:
        settings = get_settings()
        if settings.feature_flags.use_inline_scan_runner:
            loop = asyncio.get_event_loop()
            loop.create_task(ScanJobService.run_job_async(str(job_id)))
        else:
            from tasks.scan_job_tasks import process_scan_job  # noqa: WPS433

            process_scan_job.delay(str(job_id))

    @staticmethod
    async def run_job_async(job_id: str) -> None:
        session = SessionLocal()
        try:
            runner = _ScanJobRunner(session)
            await runner.execute(job_id)
        finally:
            session.close()


class _ScanJobRunner:
    def __init__(self, session) -> None:
        self.session = session

    async def execute(self, job_id: str) -> None:
        try:
            job_uuid = uuid.UUID(str(job_id))
        except ValueError:
            job_uuid = job_id  # type: ignore[assignment]

        job: Optional[ScanJob] = self.session.get(ScanJob, job_uuid)
        if not job:
            return

        job.status = "running"
        job.started_at = datetime.utcnow()
        job.error_message = None
        self.session.commit()

        chain = ProviderChain()
        try:
            await self._process_job(job, chain)
        except Exception as exc:  # noqa: BLE001
            job.status = "failed"
            job.error_message = str(exc)
            job.finished_at = datetime.utcnow()
            self.session.commit()
        finally:
            await chain.aclose()

    async def _process_job(self, job: ScanJob, chain: ProviderChain) -> None:
        policy = job.provider_policy or {}
        targets = self._generate_targets(job.area_type, job.area_payload, policy)
        max_tiles = int(policy.get("maxTiles", min(50, len(targets) if targets else 0))) or 0
        if max_tiles and len(targets) > max_tiles:
            targets = targets[:max_tiles]

        job.tiles_total = len(targets)
        self.session.commit()

        if not targets:
            job.status = "completed"
            job.finished_at = datetime.utcnow()
            job.results = {"leads": [], "tiles": [], "policy": policy}
            self.session.commit()
            return

        zoom = int(policy.get("zoom", 18))
        threshold = float(policy.get("qualityThreshold", 0.4))
        unlimited_budget = job.budget_cents <= 0
        budget_remaining = max(0, job.budget_cents - job.budget_spent_cents)

        per_provider_caps = {
            key.lower(): int(value)
            for key, value in (policy.get("perProviderCaps") or {}).items()
        }

        tile_records: List[Dict[str, Any]] = []
        leads: List[Dict[str, Any]] = []

        for index, (lat, lon) in enumerate(targets, start=1):
            if not unlimited_budget and budget_remaining <= 0:
                break

            remaining_for_providers = dict(per_provider_caps)

            def consume_budget(cost_cents: int) -> None:
                nonlocal budget_remaining
                if cost_cents <= 0:
                    return
                budget_remaining = max(0, budget_remaining - cost_cents)
                job.budget_spent_cents += cost_cents

            result = await chain.fetch(
                lat,
                lon,
                zoom=zoom,
                policy={
                    **policy,
                    "perProviderCaps": remaining_for_providers,
                    "qualityThreshold": threshold,
                },
                job_budget_cents=None if unlimited_budget else budget_remaining,
                job_budget_consumer=consume_budget,
            )

            if not result:
                continue

            job.tiles_processed += 1
            if result.cached:
                job.tiles_cached += 1

            tile_record = {
                "lat": lat,
                "lon": lon,
                "provider": result.provider,
                "quality": result.quality,
                "cached": result.cached,
                "url": result.url,
                "cost_cents": result.cost_cents,
            }
            tile_records.append(tile_record)

            confidence = round(float(result.quality), 3)
            reasons = []
            if confidence >= threshold:
                reasons.append("Imagery quality meets policy threshold")
            else:
                reasons.append("Imagery quality below preferred threshold")
            if result.cached:
                reasons.append("Tile served from cache (no spend)")

            leads.append(
                {
                    "id": f"{job.id}-{index}",
                    "centroid": {"lat": lat, "lon": lon},
                    "confidence": confidence,
                    "provider": result.provider,
                    "imagery_url": result.url,
                    "cached": result.cached,
                    "reasons": reasons,
                }
            )

            if result.cost_cents and not unlimited_budget:
                cap_key = result.provider.lower()
                if cap_key in per_provider_caps:
                    per_provider_caps[cap_key] = max(0, per_provider_caps[cap_key] - result.cost_cents)

            if not unlimited_budget and budget_remaining <= 0:
                break

        job.leads_generated = len(leads)
        job.results = {
            "policy": policy,
            "tiles": tile_records,
            "leads": leads,
        }
        job.finished_at = datetime.utcnow()

        if not unlimited_budget and budget_remaining <= 0:
            job.status = "budget_exhausted"
        else:
            job.status = "completed"

        self.session.commit()

    def _generate_targets(
        self,
        area_type: str,
        payload: Dict[str, Any],
        policy: Dict[str, Any],
    ) -> List[Tuple[float, float]]:
        spacing = float(payload.get("spacing") or policy.get("spacing") or 0.02)
        spacing = max(0.005, min(spacing, 0.1))
        max_tiles = int(policy.get("maxTiles", 40))

        if area_type == "polygon":
            coordinates = payload.get("coordinates") or []
            if coordinates and isinstance(coordinates[0][0], (list, tuple)):
                ring = coordinates[0]
            else:
                ring = coordinates
            if not ring or len(ring) < 3:
                return []
            lons = [pt[0] for pt in ring]
            lats = [pt[1] for pt in ring]
            min_lon, max_lon = min(lons), max(lons)
            min_lat, max_lat = min(lats), max(lats)

            targets: List[Tuple[float, float]] = []
            lat = min_lat
            while lat <= max_lat + 1e-9:
                lon = min_lon
                while lon <= max_lon + 1e-9:
                    if _point_in_polygon(lon, lat, ring):
                        targets.append((_round_coord(lat), _round_coord(lon)))
                    lon += spacing
                lat += spacing
            return targets

        if area_type == "bbox":
            bbox = payload.get("bbox") or []
            if len(bbox) != 4:
                return []
            min_lon, min_lat, max_lon, max_lat = map(float, bbox)
            if min_lon > max_lon or min_lat > max_lat:
                return []
            targets = []
            lat = min_lat
            while lat <= max_lat + 1e-9:
                lon = min_lon
                while lon <= max_lon + 1e-9:
                    targets.append((_round_coord(lat), _round_coord(lon)))
                    if max_tiles and len(targets) >= max_tiles:
                        return targets
                    lon += spacing
                lat += spacing
            return targets

        if area_type == "center":
            center = payload.get("center") or {}
            lat = float(center.get("lat", 0.0))
            lon = float(center.get("lon", 0.0))
            radius = float(payload.get("radius", 0.02))
            samples = int(max(1, math.ceil(radius / max(spacing, 0.01))))
            targets = [(_round_coord(lat), _round_coord(lon))]
            for i in range(1, samples + 1):
                offset = i * spacing
                targets.extend(
                    [
                        (_round_coord(lat + offset), _round_coord(lon)),
                        (_round_coord(lat - offset), _round_coord(lon)),
                        (_round_coord(lat), _round_coord(lon + offset)),
                        (_round_coord(lat), _round_coord(lon - offset)),
                    ]
                )
            return targets

        return []

