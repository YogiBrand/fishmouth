from __future__ import annotations

import asyncio
import os
from dataclasses import asdict
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from services.shared.telemetry_middleware import TelemetryMW

from services.ai.roof_analyzer import RoofAnalysisResult
from services.ai.roof_intelligence.enhanced_pipeline import ImageryQualityReport
from services.lead_generation_service import LeadScoringEngine
from services.providers.property_enrichment import PropertyProfile
from services.providers.contact_enrichment import ContactProfile
from models import LeadPriority

app = FastAPI(title="Quality Engine (8026)", version="1.0.0")
app.add_middleware(TelemetryMW)

TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8026"

scoring_engine = LeadScoringEngine()


async def _emit_cost(item: str, quantity: float, unit: str, unit_cost: float, meta: Dict[str, Any]) -> None:
    payload = {
        "service": SERVICE_ID,
        "item": item,
        "quantity": quantity,
        "unit": unit,
        "unit_cost": unit_cost,
        "meta": meta,
    }
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(f"{TELEMETRY_URL}/cost", json=payload)
    except Exception:
        pass


class Health(BaseModel):
    status: str = "ok"


@app.get("/health", response_model=Health)
async def health() -> Health:
    return Health()


class ImageryQualityIn(BaseModel):
    overall_score: float = Field(..., description="0-100 imagery quality score")
    issues: List[str] = []
    metrics: Dict[str, Any] = {}


class RoofAnalysisIn(BaseModel):
    roof_age_years: Optional[int] = None
    condition_score: float
    replacement_urgency: str
    damage_indicators: List[str] = []
    metrics: Dict[str, float] = {}
    confidence: float = 0.6
    summary: str


class PropertyProfileIn(BaseModel):
    year_built: Optional[int] = None
    property_type: Optional[str] = None
    lot_size_sqft: Optional[int] = None
    roof_material: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    square_feet: Optional[int] = None
    property_value: Optional[int] = None
    last_roof_replacement_year: Optional[int] = None
    source: Optional[str] = "api"


class ContactProfileIn(BaseModel):
    homeowner_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    length_of_residence_years: Optional[int] = None
    household_income: Optional[int] = None
    confidence: float = 0.5
    source: Optional[str] = "api"


class QualityRequest(BaseModel):
    property_profile: PropertyProfileIn
    contact_profile: ContactProfileIn
    roof_analysis: RoofAnalysisIn
    imagery_quality: ImageryQualityIn


class ScoreOut(BaseModel):
    value: float
    priority: str
    breakdown: Dict[str, float]


class QualityResponse(BaseModel):
    quality_score: float
    quality_status: str
    issues: List[str]
    score: ScoreOut
    recommended_actions: List[str]
    version: str


def _determine_quality_status(quality: ImageryQualityReport) -> str:
    score = quality.overall_score or 0.0
    critical = {"cloud_cover", "heavy_shadows", "poor_roof_visibility"}
    has_critical = any(issue in critical for issue in quality.issues)
    if score < 45:
        return "failed"
    if score < 55 or has_critical:
        return "review"
    return "passed"


def _recommended_actions(status: str, quality: ImageryQualityReport) -> List[str]:
    actions: List[str] = []
    if status == "failed":
        actions.append("Capture higher-resolution imagery")
    if "cloud_cover" in quality.issues or "heavy_shadows" in quality.issues:
        actions.append("Reschedule aerial capture for clearer conditions")
    if "poor_roof_visibility" in quality.issues:
        actions.append("Adjust camera angle or use alternative provider")
    if not actions:
        actions.append("Proceed with lead engagement")
    return actions


def _to_dataclasses(payload: QualityRequest) -> Dict[str, Any]:
    property_profile = PropertyProfile(**payload.property_profile.model_dump())
    contact_profile = ContactProfile(**payload.contact_profile.model_dump())
    imagery_quality = ImageryQualityReport(
        overall_score=payload.imagery_quality.overall_score,
        metrics=payload.imagery_quality.metrics or {},
        issues=payload.imagery_quality.issues or [],
    )
    analysis = RoofAnalysisResult(**payload.roof_analysis.model_dump())
    return {
        "property_profile": property_profile,
        "contact_profile": contact_profile,
        "imagery_quality": imagery_quality,
        "roof_analysis": analysis,
    }


@app.post("/score", response_model=QualityResponse)
async def score_quality(req: QualityRequest) -> QualityResponse:
    try:
        payload = _to_dataclasses(req)
    except TypeError as exc:  # dataclass mismatch
        raise HTTPException(status_code=400, detail=f"invalid_payload: {exc}") from exc

    imagery_quality: ImageryQualityReport = payload["imagery_quality"]
    analysis: RoofAnalysisResult = payload["roof_analysis"]
    property_profile: PropertyProfile = payload["property_profile"]
    contact_profile: ContactProfile = payload["contact_profile"]

    quality_status = _determine_quality_status(imagery_quality)
    recommended = _recommended_actions(quality_status, imagery_quality)

    score_result = scoring_engine.score(analysis, property_profile, contact_profile, imagery_quality)
    asyncio.create_task(
        _emit_cost(
            "quality_scoring",
            1,
            "analysis",
            0.02,
            {
                "quality_status": quality_status,
                "priority": score_result.priority.name.lower(),
                "quality_score": imagery_quality.overall_score,
            },
        )
    )

    return QualityResponse(
        quality_score=imagery_quality.overall_score,
        quality_status=quality_status,
        issues=imagery_quality.issues,
        recommended_actions=recommended,
        score=ScoreOut(
            value=score_result.score,
            priority=score_result.priority.name.lower(),
            breakdown=score_result.breakdown,
        ),
        version=LeadScoringEngine.SCORE_VERSION,
    )
