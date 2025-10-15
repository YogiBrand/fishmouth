"""Recalculate lead priority scores using the v1.5 weighting model."""

from __future__ import annotations

import argparse
import logging
import sys
import os
from datetime import datetime
from typing import Any, Dict

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session

from database import SessionLocal
from models import Lead
from services.ai.roof_analyzer import RoofAnalysisResult
from services.lead_generation_service import LeadScoringEngine
from services.providers.contact_enrichment import ContactProfile
from services.providers.property_enrichment import PropertyProfile
from services.ai.roof_intelligence.enhanced_pipeline import ImageryQualityReport


logger = logging.getLogger("backfill_priority_scores_v1_5")


def _build_analysis(lead: Lead, ai_payload: Dict[str, Any]) -> RoofAnalysisResult:
    metrics = ai_payload.get("metrics") or {}
    damage_indicators = lead.damage_indicators or ai_payload.get("damage_indicators") or []
    summary = ai_payload.get("summary") or "AI roof assessment backfill"
    replacement_urgency = lead.replacement_urgency or ai_payload.get("replacement_urgency") or "plan_ahead"
    confidence = ai_payload.get("confidence") or lead.analysis_confidence or 0.62
    roof_age_years = lead.roof_age_years or metrics.get("estimated_roof_age") or 0
    condition_score = lead.roof_condition_score or metrics.get("condition_score") or 75.0

    return RoofAnalysisResult(
        roof_age_years=int(roof_age_years or 0),
        condition_score=float(condition_score or 0.0),
        replacement_urgency=str(replacement_urgency),
        damage_indicators=list(damage_indicators),
        metrics=dict(metrics),
        confidence=float(confidence),
        summary=str(summary),
    )


def _build_property_profile(lead: Lead, ai_payload: Dict[str, Any]) -> PropertyProfile:
    profile_data = ai_payload.get("property_profile") or {}
    return PropertyProfile(
        year_built=lead.year_built or profile_data.get("year_built"),
        property_type=lead.property_type or profile_data.get("property_type"),
        lot_size_sqft=profile_data.get("lot_size_sqft"),
        roof_material=lead.roof_material or profile_data.get("roof_material"),
        bedrooms=profile_data.get("bedrooms"),
        bathrooms=profile_data.get("bathrooms"),
        square_feet=lead.roof_size_sqft or profile_data.get("square_feet"),
        property_value=lead.property_value or profile_data.get("property_value"),
        last_roof_replacement_year=profile_data.get("last_roof_replacement_year"),
        source=profile_data.get("source", "backfill"),
    )


def _build_contact_profile(lead: Lead, ai_payload: Dict[str, Any]) -> ContactProfile:
    profile_data = ai_payload.get("contact_profile") or {}
    return ContactProfile(
        homeowner_name=lead.homeowner_name or profile_data.get("homeowner_name"),
        email=lead.homeowner_email or profile_data.get("email"),
        phone=lead.homeowner_phone or profile_data.get("phone"),
        length_of_residence_years=profile_data.get("length_of_residence_years"),
        household_income=profile_data.get("household_income"),
        confidence=float(profile_data.get("confidence", 0.6)),
        source=profile_data.get("source", "backfill"),
    )


def _build_imagery_quality(ai_payload: Dict[str, Any], lead: Lead) -> ImageryQualityReport:
    imagery = ai_payload.get("imagery") or {}
    quality = imagery.get("quality") or {}
    overall_score = quality.get("score") or lead.image_quality_score or 0.0
    metrics = quality.get("metrics") or {}
    issues = quality.get("issues") or lead.image_quality_issues or []
    return ImageryQualityReport(
        overall_score=float(overall_score or 0.0),
        metrics=dict(metrics),
        issues=list(issues),
    )


def backfill_scores(session: Session, batch_size: int = 200) -> int:
    engine = LeadScoringEngine()
    processed = 0

    query = session.query(Lead).yield_per(batch_size)
    for lead in query:
        ai_payload = lead.ai_analysis or {}
        analysis = _build_analysis(lead, ai_payload)
        property_profile = _build_property_profile(lead, ai_payload)
        contact_profile = _build_contact_profile(lead, ai_payload)
        imagery_quality = _build_imagery_quality(ai_payload, lead)

        result = engine.score(analysis, property_profile, contact_profile, imagery_quality)

        lead.lead_score = result.score
        lead.priority = result.priority
        lead.score_version = engine.SCORE_VERSION
        lead.analysis_confidence = analysis.confidence

        updated_payload = dict(ai_payload)
        updated_payload["score_breakdown"] = result.breakdown
        updated_payload["score_version"] = engine.SCORE_VERSION
        updated_payload["confidence"] = analysis.confidence
        lead.ai_analysis = updated_payload

        processed += 1
        if processed % batch_size == 0:
            session.commit()

    session.commit()
    return processed


def main() -> None:
    parser = argparse.ArgumentParser(description="Recalculate lead priority scores using the v1.5 weights")
    parser.add_argument("--batch-size", type=int, default=200, help="Number of leads to process before committing")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    session = SessionLocal()
    try:
        start = datetime.now()
        updated = backfill_scores(session, batch_size=args.batch_size)
        duration = (datetime.now() - start).total_seconds()
        logger.info("Backfill complete", extra={"updated": updated, "duration_seconds": duration})
        print(f"Backfilled {updated} leads to scoring version {LeadScoringEngine.SCORE_VERSION} in {duration:.2f}s")
    finally:
        session.close()


if __name__ == "__main__":
    main()
