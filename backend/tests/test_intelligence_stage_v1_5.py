from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

from services.lead_generation_service import LeadScoringEngine
from services.ai.roof_analyzer import RoofAnalysisResult
from services.providers.property_enrichment import PropertyProfile
from services.providers.contact_enrichment import ContactProfile
from services.ai.roof_intelligence import EnhancedRoofAnalysisPipeline
from services.ai.roof_intelligence.enhanced_pipeline import (
    ImageryQualityReport,
    NormalizedRoofView,
    AnomalyBundle,
)
from storage import save_overlay_png


def _build_analysis() -> RoofAnalysisResult:
    return RoofAnalysisResult(
        roof_age_years=18,
        condition_score=62.0,
        replacement_urgency="urgent",
        damage_indicators=["moss_growth", "granule_loss"],
        metrics={"contrast": 0.12, "edge_density": 0.28},
        confidence=0.72,
        summary="Detected weathering across north slope with notable granule loss.",
    )


def _build_property_profile() -> PropertyProfile:
    return PropertyProfile(
        year_built=1998,
        property_type="single_family",
        lot_size_sqft=6200,
        roof_material="asphalt_shingle",
        bedrooms=4,
        bathrooms=2.5,
        square_feet=2600,
        property_value=425_000,
        last_roof_replacement_year=2008,
        source="unit_test",
    )


def _build_contact_profile(confidence: float = 0.78) -> ContactProfile:
    return ContactProfile(
        homeowner_name="Case Study",
        email="case@example.com",
        phone="(512) 555-0100",
        length_of_residence_years=7,
        household_income=140_000,
        confidence=confidence,
        source="unit_test",
    )


def test_lead_scoring_penalizes_poor_imagery() -> None:
    engine = LeadScoringEngine()
    analysis = _build_analysis()
    property_profile = _build_property_profile()
    contact_profile = _build_contact_profile()

    high_quality = ImageryQualityReport(
        overall_score=92.0,
        metrics={"laplacian_variance": 0.0042, "resolution_ok": True},
        issues=[],
    )
    poor_quality = ImageryQualityReport(
        overall_score=38.0,
        metrics={"laplacian_variance": 0.0007, "resolution_ok": False},
        issues=["soft_focus", "low_resolution", "too_dark"],
    )

    high_result = engine.score(analysis, property_profile, contact_profile, high_quality)
    poor_result = engine.score(analysis, property_profile, contact_profile, poor_quality)

    assert poor_result.score < high_result.score
    assert poor_result.breakdown["imagery_quality"] < high_result.breakdown["imagery_quality"]


def test_save_overlay_png_creates_file() -> None:
    overlays_root = Path("backend/uploads/overlays")
    overlays_root.mkdir(parents=True, exist_ok=True)

    identifier = "test_overlay_unit"
    url = save_overlay_png(identifier, b"binary-data")

    expected_path = overlays_root / f"{identifier}.png"
    try:
        assert url.endswith(f"/overlays/{identifier}.png")
        assert expected_path.exists()
        assert expected_path.read_bytes() == b"binary-data"
    finally:
        if expected_path.exists():
            expected_path.unlink()


@pytest.mark.asyncio
async def test_pipeline_confidence_blend_reacts_to_quality() -> None:
    pipeline = EnhancedRoofAnalysisPipeline()
    try:
        image = Image.new("RGB", (128, 128), color=(180, 180, 180))
        mask = Image.new("L", (128, 128), color=255)
        image_buf = BytesIO()
        mask_buf = BytesIO()
        image.save(image_buf, format="JPEG")
        mask.save(mask_buf, format="PNG")

        normalized_view = NormalizedRoofView(
            image_bytes=image_buf.getvalue(),
            mask_bytes=mask_buf.getvalue(),
            rotation_degrees=0.0,
            coverage_ratio=0.82,
            bounding_box=(0, 0, 128, 128),
            width=128,
            height=128,
        )

        anomaly_bundle = AnomalyBundle(anomalies=[], heatmap_bytes=None)

        good_quality = ImageryQualityReport(
            overall_score=88.0,
            metrics={"laplacian_variance": 0.0038, "resolution_ok": True},
            issues=[],
        )
        poor_quality = ImageryQualityReport(
            overall_score=34.0,
            metrics={"laplacian_variance": 0.0009, "resolution_ok": False},
            issues=["soft_focus", "low_resolution"],
        )

        good_confidence = pipeline._combine_confidence(0.68, good_quality, anomaly_bundle, normalized_view, [])
        poor_confidence = pipeline._combine_confidence(0.68, poor_quality, anomaly_bundle, normalized_view, [])

        assert poor_confidence < good_confidence
        assert 0.35 <= poor_confidence <= 0.98
        assert 0.35 <= good_confidence <= 0.98
    finally:
        await pipeline.aclose()
