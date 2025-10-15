"""High-level scan creation endpoint (polygon-aware) built atop ScanJobService."""

from __future__ import annotations

import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from shapely.geometry import shape

from app.modules.geo.scanner_service import cover_polygon_with_tiles
from auth import get_current_user
from database import SessionLocal
from models import ScanJob, User
from services.scan_job_service import ScanJobService


router = APIRouter(prefix="/api/v1/scans", tags=["scans"])


class ScanCreate(BaseModel):
    name: Optional[str] = Field(None, description="Friendly label shown to the user")
    area_geojson: Dict[str, Any] = Field(..., description="Polygon, MultiPolygon or bbox GeoJSON")
    provider_policy: Dict[str, Any] = Field(default_factory=dict)
    filters: Dict[str, Any] = Field(default_factory=dict)
    enrichment_options: Dict[str, Any] = Field(default_factory=dict)
    budget_cents: int = Field(0, ge=0)


class ScanResponse(BaseModel):
    id: str
    status: str
    tiles_total: int
    created_at: Optional[str]
    name: Optional[str]
    policy: Dict[str, Any]


class ScanStatusResponse(BaseModel):
    id: str
    status: str
    tiles_total: int
    tiles_processed: int
    leads_generated: int
    budget_cents: int
    budget_spent_cents: int
    results: Optional[Dict[str, Any]] = None


def _geometry_kind(geojson_payload: Dict[str, Any]) -> str:
    geom = shape(geojson_payload)
    if geom.is_empty:
        raise HTTPException(status_code=400, detail="Geometry is empty")
    if geom.geom_type in {"Polygon", "MultiPolygon"}:
        return "polygon"
    if geom.geom_type in {"Point", "MultiPoint"}:
        return "center"
    if geom.geom_type in {"LineString", "MultiLineString"}:
        raise HTTPException(status_code=400, detail="Line geometry is not supported")
    raise HTTPException(status_code=400, detail=f"Unsupported geometry: {geom.geom_type}")


def _estimate_tiles(geojson_payload: Dict[str, Any], policy: Dict[str, Any]) -> int:
    try:
        geom = shape(geojson_payload)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail="Invalid GeoJSON payload") from exc

    if geom.geom_type not in {"Polygon", "MultiPolygon"}:
        return 0

    zoom = int(policy.get("zoom", 18))
    polygons = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
    tile_ids = []
    for poly in polygons:
        tile_ids.extend(cover_polygon_with_tiles(poly, zoom=zoom, max_tiles=2500))
    return len(tile_ids)


def _summary(job: ScanJob) -> ScanResponse:
    return ScanResponse(
        id=str(job.id),
        status=job.status,
        tiles_total=job.tiles_total,
        created_at=job.created_at.isoformat() if job.created_at else None,
        name=job.area_payload.get("name") if isinstance(job.area_payload, dict) else None,
        policy=job.provider_policy or {},
    )


def _status(job: ScanJob) -> ScanStatusResponse:
    return ScanStatusResponse(
        id=str(job.id),
        status=job.status,
        tiles_total=job.tiles_total,
        tiles_processed=job.tiles_processed,
        leads_generated=job.leads_generated,
        budget_cents=job.budget_cents,
        budget_spent_cents=job.budget_spent_cents,
        results=job.results or {},
    )


@router.post("", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def create_scan(
    body: ScanCreate,
    current_user: User = Depends(get_current_user),
) -> ScanResponse:
    """Create a scan job and dispatch processing for the supplied polygon/area."""

    area_type = _geometry_kind(body.area_geojson)
    tiles_estimate = _estimate_tiles(body.area_geojson, body.provider_policy)

    session = SessionLocal()
    try:
        service = ScanJobService(session)
        job = service.create_job(
            user_id=current_user.id,
            area_type=area_type,
            area_payload={
                **body.area_geojson,
                "name": body.name,
                "tilesEstimate": tiles_estimate,
            },
            provider_policy=body.provider_policy,
            filters=body.filters,
            enrichment_options=body.enrichment_options,
            budget_cents=body.budget_cents,
        )
        if tiles_estimate:
            job.tiles_total = tiles_estimate
            session.commit()
        service.dispatch_job(job.id)
        return _summary(job)
    finally:
        session.close()


@router.get("/{scan_id}", response_model=ScanStatusResponse)
async def get_scan(scan_id: str, current_user: User = Depends(get_current_user)) -> ScanStatusResponse:
    """Return scan job status and aggregated stats."""

    session = SessionLocal()
    try:
        service = ScanJobService(session)
        try:
            job_uuid = uuid.UUID(scan_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="Scan not found") from exc
        job = service.get_job(job_uuid, current_user.id)
        if not job:
            raise HTTPException(status_code=404, detail="Scan not found")
        return _status(job)
    finally:
        session.close()
