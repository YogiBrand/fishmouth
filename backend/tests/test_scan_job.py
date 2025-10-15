import asyncio

import pytest

from config import get_settings
from database import Base, SessionLocal, engine
from models import ScanJob
from services.scan_job_service import ScanJobService


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield


def test_polygon_scan_job_generates_leads(monkeypatch):
    settings = get_settings()
    settings.feature_flags.use_mock_imagery = True

    session = SessionLocal()
    service = ScanJobService(session)

    polygon = {
        "coordinates": [
            [
                [-97.7505, 30.2747],
                [-97.7500, 30.2749],
                [-97.7495, 30.2746],
                [-97.7505, 30.2747],
            ]
        ]
    }

    job = service.create_job(
        user_id=1,
        area_type="polygon",
        area_payload=polygon,
        provider_policy={"maxTiles": 6, "qualityThreshold": 0.3, "zoom": 17},
        filters={"minRoofAge": 5},
        enrichment_options={"contact": True},
        budget_cents=0,
    )
    session.close()

    asyncio.run(ScanJobService.run_job_async(str(job.id)))

    session = SessionLocal()
    persisted = session.get(ScanJob, job.id)
    assert persisted is not None
    assert persisted.status in {"completed", "budget_exhausted"}
    assert persisted.tiles_processed > 0
    assert persisted.leads_generated == len(persisted.results.get("leads", []))
    session.close()
