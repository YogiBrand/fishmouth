from __future__ import annotations

import asyncio
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from services.shared.telemetry_middleware import TelemetryMW

from services.ai.roof_intelligence.enhanced_pipeline import (
    EnhancedRoofAnalysisPipeline,
    EnhancedRoofAnalysisResult,
    RoofAnomaly,
    StreetViewAsset,
)
from services.providers.property_enrichment import PropertyProfile

app = FastAPI(title="Vision AI (8024)", version="1.0.0")
app.add_middleware(TelemetryMW)

TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8024"

# Ensure storage root exists for local file persistence
Path("uploads/aerial").mkdir(parents=True, exist_ok=True)
pipeline = EnhancedRoofAnalysisPipeline()


async def _emit_cost(item: str, quantity: float, unit: str, unit_cost: float, meta: dict | None = None):
    if SERVICE_ID == "8030":
        return
    payload = {
        "service": SERVICE_ID,
        "item": item,
        "quantity": quantity,
        "unit": unit,
        "unit_cost": unit_cost,
        "meta": meta or {},
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


class PropertyProfileInput(BaseModel):
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


class AnalyzeRequest(BaseModel):
    property_id: str = Field(..., description="Unique identifier used to persist imagery assets.")
    latitude: float
    longitude: float
    property_profile: Optional[PropertyProfileInput] = None
    enable_street_view: bool = Field(default=False, description="When true, collects curbside imagery if available.")


class ImageryQualityOut(BaseModel):
    overall_score: float
    metrics: Dict[str, Any]
    issues: List[str]


class ImageryAssetOut(BaseModel):
    public_url: str
    source: str
    captured_at: str
    resolution: List[int]
    quality: ImageryQualityOut


class NormalizedViewOut(BaseModel):
    image_url: Optional[str]
    mask_url: Optional[str]
    coverage_ratio: float
    rotation_degrees: float


class RoofAnalysisOut(BaseModel):
    roof_age_years: int
    condition_score: float
    replacement_urgency: str
    damage_indicators: List[str]
    metrics: Dict[str, float]
    confidence: float
    summary: str


class AnomalyOut(BaseModel):
    type: str
    severity: float
    probability: float
    description: str
    coverage_sqft: float
    mask_url: Optional[str]
    color: Optional[str] = None


class AnomalyBundleOut(BaseModel):
    heatmap_url: Optional[str]
    legend: Dict[str, str]
    anomalies: List[AnomalyOut]


class StreetViewAssetOut(BaseModel):
    heading: float
    pitch: float
    fov: float
    source: str
    captured_at: str
    distance_m: float
    occlusion_score: float
    quality_score: float
    anomalies: List[AnomalyOut]
    public_url: str


class AnalyzeResponse(BaseModel):
    imagery: ImageryAssetOut
    normalized_view: NormalizedViewOut
    roof_analysis: RoofAnalysisOut
    anomaly_bundle: AnomalyBundleOut
    street_view_assets: List[StreetViewAssetOut]
    dossier: Dict[str, Any]


def _to_property_profile(data: Optional[PropertyProfileInput]) -> PropertyProfile:
    payload = data.dict() if data else {}
    return PropertyProfile(
        year_built=payload.get("year_built"),
        property_type=payload.get("property_type"),
        lot_size_sqft=payload.get("lot_size_sqft"),
        roof_material=payload.get("roof_material"),
        bedrooms=payload.get("bedrooms"),
        bathrooms=payload.get("bathrooms"),
        square_feet=payload.get("square_feet"),
        property_value=payload.get("property_value"),
        last_roof_replacement_year=payload.get("last_roof_replacement_year"),
        source=payload.get("source", "api"),
    )


def _anomaly_to_out(anomaly: RoofAnomaly) -> AnomalyOut:
    return AnomalyOut(
        type=anomaly.type,
        severity=anomaly.severity,
        probability=anomaly.probability,
        description=anomaly.description,
        coverage_sqft=anomaly.coverage_sqft,
        mask_url=anomaly.mask_url,
        color=anomaly.color,
    )


def _street_asset_to_out(asset: StreetViewAsset) -> StreetViewAssetOut:
    return StreetViewAssetOut(
        heading=asset.heading,
        pitch=asset.pitch,
        fov=asset.fov,
        source=asset.source,
        captured_at=asset.captured_at.isoformat(),
        distance_m=asset.distance_m,
        occlusion_score=asset.occlusion_score,
        quality_score=asset.quality_score,
        anomalies=[_anomaly_to_out(a) for a in asset.anomalies],
        public_url=asset.public_url,
    )


def _result_to_response(result: EnhancedRoofAnalysisResult) -> AnalyzeResponse:
    imagery = result.imagery
    normalized = result.normalized_view
    anomaly_bundle = result.anomaly_bundle
    response = AnalyzeResponse(
        imagery=ImageryAssetOut(
            public_url=imagery.public_url,
            source=imagery.source,
            captured_at=imagery.captured_at.isoformat(),
            resolution=list(imagery.resolution),
            quality=ImageryQualityOut(
                overall_score=imagery.quality.overall_score,
                metrics=imagery.quality.metrics,
                issues=imagery.quality.issues,
            ),
        ),
        normalized_view=NormalizedViewOut(
            image_url=normalized.image_url,
            mask_url=normalized.mask_url,
            coverage_ratio=normalized.coverage_ratio,
            rotation_degrees=normalized.rotation_degrees,
        ),
        roof_analysis=RoofAnalysisOut(
            roof_age_years=result.roof_analysis.roof_age_years,
            condition_score=result.roof_analysis.condition_score,
            replacement_urgency=result.roof_analysis.replacement_urgency,
            damage_indicators=result.roof_analysis.damage_indicators,
            metrics=result.roof_analysis.metrics,
            confidence=result.roof_analysis.confidence,
            summary=result.roof_analysis.summary,
        ),
        anomaly_bundle=AnomalyBundleOut(
            heatmap_url=anomaly_bundle.heatmap_url,
            legend=anomaly_bundle.legend,
            anomalies=[_anomaly_to_out(a) for a in anomaly_bundle.anomalies],
        ),
        street_view_assets=[_street_asset_to_out(asset) for asset in result.street_view_assets],
        dossier=result.dossier,
    )
    return response


@app.post("/analyze/roof", response_model=AnalyzeResponse)
async def analyze_roof(req: AnalyzeRequest) -> AnalyzeResponse:
    profile = _to_property_profile(req.property_profile)
    try:
        result = await pipeline.analyze_roof_with_quality_control(
            property_id=req.property_id,
            latitude=req.latitude,
            longitude=req.longitude,
            property_profile=profile,
            enable_street_view=req.enable_street_view,
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"analysis_failed: {exc}") from exc

    asyncio.create_task(
        _emit_cost(
            "premium_imagery_analysis",
            1,
            "analysis",
            0.35,
            {"property_id": req.property_id, "provider": result.imagery.source},
        )
    )
    return _result_to_response(result)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    await pipeline.aclose()
