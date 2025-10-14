import pytest

import services.sequence_delivery as delivery_module
from config import get_settings


@pytest.fixture(autouse=True)
def setup_mock_delivery():
    """Ensure delivery adapters operate in mock mode for deterministic tests."""
    settings = get_settings()
    original_flag = settings.feature_flags.use_mock_sequence_delivery
    delivery_module._cached_adapters = None  # reset global cache
    settings.feature_flags.use_mock_sequence_delivery = True
    try:
        yield
    finally:
        delivery_module._cached_adapters = None
        settings.feature_flags.use_mock_sequence_delivery = original_flag


@pytest.mark.asyncio
async def test_mock_email_adapter_returns_success():
    adapters = delivery_module.get_delivery_adapters()
    result = await adapters.email.send_email(
        to_address="test@example.com",
        subject="Test Subject",
        body="Hello world",
    )
    assert result.success is True
    assert result.provider == "mock.email"
    assert "test@example.com" in result.metadata.get("to")


@pytest.mark.asyncio
async def test_mock_sms_adapter_returns_success():
    adapters = delivery_module.get_delivery_adapters()
    result = await adapters.sms.send_sms(
        to_number="+15555550100",
        body="Hello from Fish Mouth!",
    )
    assert result.success is True
    assert result.provider == "mock.sms"
    assert result.metadata.get("to") == "+15555550100"
