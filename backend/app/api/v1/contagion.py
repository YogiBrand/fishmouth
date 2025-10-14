"""Endpoints for contagion analysis and lead scoring."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException

from app.services.activity_stream import activity_notifier
from app.services.contagion_analyzer import ContagionAnalyzerService

router = APIRouter(prefix="/api/v1/contagion", tags=["contagion"])


@router.get("/hot-leads")
async def list_hot_leads(
    min_score: int = 70,
    limit: int = 50,
    city: Optional[str] = None,
    state: Optional[str] = None,
):
    leads = await ContagionAnalyzerService.get_hot_leads(
        city=city,
        state=state,
        min_score=min_score,
        limit=limit,
    )
    return {"leads": leads}


@router.post("/identify")
async def identify_clusters(city: str, state: str, min_permits: int = 3, days_back: int = 90):
    clusters = await ContagionAnalyzerService.identify_clusters(city, state, min_permits=min_permits, days_back=days_back)
    activity_notifier.publish(
        "clusters_identified",
        {
            "city": city,
            "state": state,
            "cluster_count": len(clusters),
        },
    )
    return {"clusters": clusters}


@router.post("/clusters/{cluster_id}/score")
async def score_cluster(cluster_id: str, max_properties: int = 1000):
    try:
        result = await ContagionAnalyzerService.score_cluster_properties(cluster_id, max_properties=max_properties)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    activity_notifier.publish("cluster_scored", {"cluster_id": cluster_id, **result})
    return result


@router.get("/clusters")
async def list_clusters(city: Optional[str] = None, state: Optional[str] = None, limit: int = 50):
    clusters = await ContagionAnalyzerService.list_clusters(city=city, state=state, limit=limit)
    return {"clusters": clusters}
