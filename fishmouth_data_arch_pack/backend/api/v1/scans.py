from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from shapely.geometry import shape
from app.db import get_db  # your session helper

router = APIRouter(prefix="/api/v1/scans", tags=["scans"])

class ScanCreate(BaseModel):
    name: Optional[str]
    area_geojson: Dict[str, Any]
    provider_policy: Dict[str, Any] = {}
    filters: Dict[str, Any] = {}

@router.post("")
def create_scan(body: ScanCreate):
    """Create a scan job from polygon or area selection."""
    # TODO: insert into scan_jobs with ST_GeomFromGeoJSON and queue Celery task
    return {"ok": True, "scan_id": "TODO"}

@router.get("/{scan_id}")
def get_scan(scan_id: str):
    """Return scan job status and stats."""
    # TODO: select from scan_jobs and results counts
    return {"scan_id": scan_id, "status": "queued", "stats": {}}
