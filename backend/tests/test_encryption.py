import os

import pytest

from config import get_settings
from services.encryption import decrypt_value, encrypt_value


@pytest.fixture
def encryption_key(monkeypatch):
    key = "Ycdbg2J6FZl9QW9-AVSkl8+C/9IY26k7nrR8QqLzNdg="
    monkeypatch.setenv("PII_ENCRYPTION_KEY", key)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
    monkeypatch.delenv("PII_ENCRYPTION_KEY", raising=False)


def test_encrypt_decrypt_roundtrip(encryption_key):
    plaintext = "555-123-4567"
    token = encrypt_value(plaintext)
    assert token != plaintext
    assert decrypt_value(token) == plaintext
