from datetime import datetime

import pytest

from database import Base, SessionLocal, engine
from models import AreaScan, Lead, LeadPriority, LeadStatus
from services.lead_generation_service import LeadGenerationService
from services.etl import canonical_address_key, compute_dedupe_key


@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def _sample_payload(area_scan: AreaScan) -> dict:
    address = "123 Testing Ave"
    city = "Testville"
    state = "TX"
    zip_code = "75001"
    address_key = canonical_address_key(address, city, state, zip_code)
    dedupe_key = compute_dedupe_key("Jane Doe", address_key)

    return {
        "user_id": area_scan.user_id,
        "area_scan_id": area_scan.id,
        "address": address,
        "city": city,
        "state": state,
        "zip_code": zip_code,
        "latitude": 32.0,
        "longitude": -96.0,
        "roof_age_years": 12,
        "roof_condition_score": 82.0,
        "roof_material": "asphalt",
        "roof_size_sqft": 2100,
        "aerial_image_url": None,
        "ai_analysis": {"summary": "Initial analysis"},
        "lead_score": 68.0,
        "priority": LeadPriority.WARM,
        "replacement_urgency": "moderate",
        "damage_indicators": ["hail"],
        "discovery_status": "scanner",
        "imagery_status": "synthetic",
        "property_enrichment_status": "synthetic",
        "contact_enrichment_status": "synthetic",
        "homeowner_name": "Jane Doe",
        "homeowner_email": "jane@example.com",
        "homeowner_phone": "+12145550123",
        "contact_enriched": True,
        "property_value": 325000,
        "year_built": 1995,
        "property_type": "single_family",
        "length_of_residence": 6,
        "cost_to_generate": 1.25,
        "estimated_value": 14000.0,
        "conversion_probability": 78.0,
        "status": LeadStatus.NEW,
        "image_quality_score": 88.0,
        "image_quality_issues": [],
        "quality_validation_status": "passed",
        "roof_intelligence": {},
        "street_view_quality": {},
        "dedupe_key": dedupe_key,
        "provenance": {},
        "dnc": False,
        "consent_email": False,
        "consent_sms": False,
        "consent_voice": False,
    }


def _provenance_record() -> dict:
    now = datetime.utcnow().isoformat()
    return {
        "discovery": {"source": "scanner", "timestamp": now},
        "imagery": {"source": "synthetic", "status": "passed", "timestamp": now},
    }


def test_upsert_lead_merges_duplicates():
    session = SessionLocal()
    service = LeadGenerationService(session)

    area_scan = AreaScan(user_id=1, area_name="Test", scan_type="city")
    session.add(area_scan)
    session.commit()

    payload = _sample_payload(area_scan)
    provenance = _provenance_record()

    lead, merged = service._upsert_lead(area_scan, payload, provenance)
    assert merged is False
    assert lead.dedupe_key == payload["dedupe_key"]
    assert session.query(Lead).count() == 1

    payload_update = dict(payload)
    payload_update["lead_score"] = 80.0
    payload_update["priority"] = LeadPriority.HOT
    payload_update["damage_indicators"] = payload["damage_indicators"] + ["wind"]
    lead_updated, merged_flag = service._upsert_lead(area_scan, payload_update, provenance)

    assert merged_flag is True
    assert session.query(Lead).count() == 1
    assert lead_updated.lead_score == 80.0
    assert lead_updated.priority == LeadPriority.HOT
    assert set(lead_updated.damage_indicators or []) == {"hail", "wind"}

    session.close()
