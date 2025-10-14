import pytest

from config import get_settings
from services.providers.property_discovery import PropertyDiscoveryService
from services.providers.property_enrichment import PropertyEnrichmentService
from services.providers.contact_enrichment import ContactEnrichmentService
from services.providers.imagery_provider import ImageryProvider


@pytest.fixture(autouse=True)
def enable_mock_providers():
    settings = get_settings()

    original_flags = {
        "imagery": settings.feature_flags.use_mock_imagery,
        "discovery": settings.feature_flags.use_mock_property_discovery,
        "property": settings.feature_flags.use_mock_property_enrichment,
        "contact": settings.feature_flags.use_mock_contact_enrichment,
    }

    settings.feature_flags.use_mock_imagery = True
    settings.feature_flags.use_mock_property_discovery = True
    settings.feature_flags.use_mock_property_enrichment = True
    settings.feature_flags.use_mock_contact_enrichment = True

    yield

    settings.feature_flags.use_mock_imagery = original_flags["imagery"]
    settings.feature_flags.use_mock_property_discovery = original_flags["discovery"]
    settings.feature_flags.use_mock_property_enrichment = original_flags["property"]
    settings.feature_flags.use_mock_contact_enrichment = original_flags["contact"]


@pytest.mark.asyncio
async def test_property_discovery_deterministic_results():
    service = PropertyDiscoveryService()
    try:
        first = await service.discover("Orlando, FL", limit=5)
        second = await service.discover("Orlando, FL", limit=5)
    finally:
        await service.aclose()

    assert len(first) == len(second) == 5
    assert [candidate.address for candidate in first] == [candidate.address for candidate in second]
    assert {candidate.source for candidate in first} == {"synthetic"}


@pytest.mark.asyncio
async def test_property_enrichment_mock_source():
    service = PropertyEnrichmentService()
    try:
        profile = await service.enrich("123 Mockingbird Lane", 28.5, -81.4)
    finally:
        await service.aclose()

    assert profile.source == "synthetic"
    assert profile.property_value is not None


@pytest.mark.asyncio
async def test_contact_enrichment_mock_source():
    service = ContactEnrichmentService()
    try:
        profile = await service.enrich("123 Mockingbird Lane", "Orlando", "FL")
    finally:
        await service.aclose()

    assert profile.source == "synthetic"
    assert profile.phone
    assert profile.email


@pytest.mark.asyncio
async def test_imagery_provider_returns_placeholder_bytes():
    provider = ImageryProvider()
    try:
        result = await provider.fetch(28.5383, -81.3792)
    finally:
        await provider.aclose()

    assert result.source == "generated"
    assert result.raw_bytes
    assert result.public_url
