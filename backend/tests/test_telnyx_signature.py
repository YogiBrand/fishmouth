import base64
import json

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519
from fastapi import HTTPException
from starlette.requests import Request

from config import get_settings
from main import verify_telnyx_signature


def build_request(headers: dict) -> Request:
    scope = {
        "type": "http",
        "headers": [(k.lower().encode("utf-8"), v.encode("utf-8")) for k, v in headers.items()],
        "method": "POST",
        "path": "/api/webhooks/telnyx",
    }
    return Request(scope)


def test_verify_telnyx_signature_ed25519_success():
    payload = {"data": {"event_type": "call.answered"}}
    timestamp = "1700000000"
    serialized = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    message = f"{timestamp}|{serialized}".encode("utf-8")

    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    signature = private_key.sign(message)

    settings = get_settings()
    original_public = settings.providers.telnyx_webhook_public_key
    settings.providers.telnyx_webhook_public_key = base64.b64encode(public_bytes).decode("utf-8")
    settings.providers.telnyx_webhook_secret = None

    request = build_request(
        {
            "Telnyx-Timestamp": timestamp,
            "Telnyx-Signature-Ed25519": base64.b64encode(signature).decode("utf-8"),
        }
    )

    try:
        verify_telnyx_signature(request, payload)
    finally:
        settings.providers.telnyx_webhook_public_key = original_public


def test_verify_telnyx_signature_rejects_invalid():
    payload = {"data": {}}
    timestamp = "1700000000"
    settings = get_settings()
    original_secret = settings.providers.telnyx_webhook_secret
    settings.providers.telnyx_webhook_secret = "secret"
    settings.providers.telnyx_webhook_public_key = None

    request = build_request(
        {
            "Telnyx-Timestamp": timestamp,
            "Telnyx-Signature-256": "invalid",
        }
    )

    with pytest.raises(HTTPException):
        verify_telnyx_signature(request, payload)

    settings.providers.telnyx_webhook_secret = original_secret
