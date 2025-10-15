"""Dashboard endpoints for aggregated metrics and feeds."""

from __future__ import annotations

from fastapi import APIRouter

from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/api/v1/dashboard", tags=["dashboard"])


@router.get("/stats")
async def dashboard_stats():
    return await DashboardService.fetch_overview()


@router.get("/summary")
async def dashboard_summary(lead_limit: int = 25):
    return await DashboardService.fetch_summary(lead_limit=lead_limit)


@router.get("/active-clusters")
async def dashboard_active_clusters(limit: int = 25):
    clusters = await DashboardService.fetch_active_clusters(limit=limit)
    return {"clusters": clusters}


@router.get("/activity")
async def dashboard_recent_activity(limit: int = 15):
    activity = await DashboardService.fetch_recent_activity(limit=limit)
    return {"activity": activity}


@router.get("/hot-leads")
async def dashboard_hot_leads(min_score: int = 75, limit: int = 50):
    leads = await DashboardService.fetch_hot_leads(min_score=min_score, limit=limit)
    return {"leads": leads}
