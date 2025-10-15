"""Activity feed endpoint backed by the unified events table."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.dashboard_service import DashboardService


router = APIRouter(prefix="/api/v1", tags=["activity"])


@router.get("/activity")
async def get_activity(limit: int = 50):
    events = await DashboardService.fetch_recent_events(limit=limit)
    return {"events": events}

