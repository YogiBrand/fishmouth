from __future__ import annotations

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth import get_current_user
from database import SessionLocal
from models import ScanJob, User
from services.scan_job_service import ScanJobService

router = APIRouter(prefix="/api/v1/scan-jobs", tags=["scan-jobs"])


class ScanJobCreate(BaseModel):
    area_type: str = Field(pattern="^(polygon|bbox|center)$")
    area_payload: Dict[str, Any]
    provider_policy: Dict[str, Any] = Field(default_factory=dict)
    filters: Optional[Dict[str, Any]] = None
    enrichment_options: Optional[Dict[str, Any]] = None
    budget_cents: int = Field(ge=0, default=0)


class ScanJobSummary(BaseModel):
    id: str
    area_type: str
    status: str
    budget_cents: int
    budget_spent_cents: int
    tiles_total: int
    tiles_processed: int
    tiles_cached: int
    leads_generated: int
    created_at: Optional[str]
    started_at: Optional[str]
    finished_at: Optional[str]


class ScanJobResults(BaseModel):
    id: str
    status: str
    leads: List[Dict[str, Any]]
    tiles: List[Dict[str, Any]]
    policy: Dict[str, Any]


def _to_summary(job: ScanJob) -> ScanJobSummary:
    return ScanJobSummary(
        id=str(job.id),
        area_type=job.area_type,
        status=job.status,
        budget_cents=job.budget_cents,
        budget_spent_cents=job.budget_spent_cents,
        tiles_total=job.tiles_total,
        tiles_processed=job.tiles_processed,
        tiles_cached=job.tiles_cached,
        leads_generated=job.leads_generated,
        created_at=job.created_at.isoformat() if job.created_at else None,
        started_at=job.started_at.isoformat() if job.started_at else None,
        finished_at=job.finished_at.isoformat() if job.finished_at else None,
    )


@router.post("", response_model=ScanJobSummary, status_code=status.HTTP_201_CREATED)
async def create_scan_job(
    payload: ScanJobCreate,
    current_user: User = Depends(get_current_user),
) -> ScanJobSummary:
    session = SessionLocal()
    try:
        service = ScanJobService(session)
        job = service.create_job(
            user_id=current_user.id,
            area_type=payload.area_type,
            area_payload=payload.area_payload,
            provider_policy=payload.provider_policy,
            filters=payload.filters,
            enrichment_options=payload.enrichment_options,
            budget_cents=payload.budget_cents,
        )
        service.dispatch_job(job.id)
        return _to_summary(job)
    finally:
        session.close()


@router.get("", response_model=List[ScanJobSummary])
async def list_scan_jobs(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
) -> List[ScanJobSummary]:
    session = SessionLocal()
    try:
        service = ScanJobService(session)
        jobs = service.list_jobs(current_user.id, limit=limit)
        return [_to_summary(job) for job in jobs]
    finally:
        session.close()


@router.get("/{job_id}", response_model=ScanJobSummary)
async def get_scan_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> ScanJobSummary:
    session = SessionLocal()
    try:
        service = ScanJobService(session)
        try:
            job_uuid = uuid.UUID(job_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Scan job not found") from None
        job = service.get_job(job_uuid, current_user.id)
        if not job:
            raise HTTPException(status_code=404, detail="Scan job not found")
        return _to_summary(job)
    finally:
        session.close()


@router.get("/{job_id}/results", response_model=ScanJobResults)
async def get_scan_job_results(
    job_id: str,
    current_user: User = Depends(get_current_user),
) -> ScanJobResults:
    session = SessionLocal()
    try:
        service = ScanJobService(session)
        try:
            job_uuid = uuid.UUID(job_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="Scan job not found") from None
        job = service.get_job(job_uuid, current_user.id)
        if not job:
            raise HTTPException(status_code=404, detail="Scan job not found")
        results = job.results or {}
        leads = results.get("leads", [])
        tiles = results.get("tiles", [])
        return ScanJobResults(
            id=str(job.id),
            status=job.status,
            leads=leads,
            tiles=tiles,
            policy=results.get("policy", job.provider_policy or {}),
        )
    finally:
        session.close()
