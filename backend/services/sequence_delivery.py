"""Delivery adapters for email, SMS, and voice sequence steps."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx

from config import get_settings


logger = logging.getLogger(__name__)


@dataclass
class DeliveryResult:
    """Outcome of a delivery attempt."""

    success: bool
    provider: str
    message_id: Optional[str] = None
    cost: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


class EmailDeliveryAdapter:
    """Base adapter for sending emails as part of a sequence."""

    async def send_email(
        self,
        to_address: str,
        subject: str,
        body: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> DeliveryResult:
        raise NotImplementedError


class SmsDeliveryAdapter:
    """Base adapter for sending SMS messages."""

    async def send_sms(
        self,
        to_number: str,
        body: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> DeliveryResult:
        raise NotImplementedError


class VoiceDeliveryAdapter:
    """Base adapter for queueing AI voice calls (hand-off to Playbook 4)."""

    async def initiate_call(
        self,
        to_number: str,
        script: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> DeliveryResult:
        raise NotImplementedError


class MockEmailDeliveryAdapter(EmailDeliveryAdapter):
    async def send_email(self, to_address: str, subject: str, body: str, metadata: Optional[Dict[str, Any]] = None) -> DeliveryResult:
        return DeliveryResult(
            success=True,
            provider="mock.email",
            message_id=f"mock-email-{uuid.uuid4()}",
            metadata={
                "to": to_address,
                "subject": subject,
                "body": body,
                **(metadata or {}),
            },
        )


class MockSmsDeliveryAdapter(SmsDeliveryAdapter):
    async def send_sms(self, to_number: str, body: str, metadata: Optional[Dict[str, Any]] = None) -> DeliveryResult:
        return DeliveryResult(
            success=True,
            provider="mock.sms",
            message_id=f"mock-sms-{uuid.uuid4()}",
            metadata={
                "to": to_number,
                "body": body,
                **(metadata or {}),
            },
        )


class MockVoiceDeliveryAdapter(VoiceDeliveryAdapter):
    async def initiate_call(self, to_number: str, script: str, metadata: Optional[Dict[str, Any]] = None) -> DeliveryResult:
        return DeliveryResult(
            success=True,
            provider="mock.voice",
            message_id=f"mock-voice-{uuid.uuid4()}",
            metadata={
                "to": to_number,
                "script": script,
                **(metadata or {}),
            },
        )


class SendGridEmailDeliveryAdapter(EmailDeliveryAdapter):
    """SendGrid implementation using the v3 API."""

    def __init__(self, api_key: str, sender: str) -> None:
        self._api_key = api_key
        self._sender = sender
        self._client = httpx.AsyncClient(
            base_url="https://api.sendgrid.com/v3",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=10.0,
        )

    async def send_email(self, to_address: str, subject: str, body: str, metadata: Optional[Dict[str, Any]] = None) -> DeliveryResult:
        payload = {
            "personalizations": [{"to": [{"email": to_address}]}],
            "from": {"email": self._sender},
            "subject": subject,
            "content": [{"type": "text/plain", "value": body}],
        }
        response = await self._client.post("/mail/send", json=payload)
        response.raise_for_status()
        message_id = response.headers.get("X-Message-Id") or str(uuid.uuid4())
        return DeliveryResult(
            success=True,
            provider="sendgrid",
            message_id=message_id,
            metadata={
                "status_code": response.status_code,
                **(metadata or {}),
            },
        )


class PostmarkEmailDeliveryAdapter(EmailDeliveryAdapter):
    """Postmark transactional email adapter."""

    def __init__(self, api_token: str, sender: str) -> None:
        self._api_token = api_token
        self._sender = sender
        self._client = httpx.AsyncClient(
            base_url="https://api.postmarkapp.com",
            headers={
                "X-Postmark-Server-Token": api_token,
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            timeout=10.0,
        )

    async def send_email(self, to_address: str, subject: str, body: str, metadata: Optional[Dict[str, Any]] = None) -> DeliveryResult:
        payload = {
            "From": self._sender,
            "To": to_address,
            "Subject": subject,
            "TextBody": body,
        }
        response = await self._client.post("/email", json=payload)
        response.raise_for_status()
        data = response.json()
        return DeliveryResult(
            success=True,
            provider="postmark",
            message_id=data.get("MessageID", str(uuid.uuid4())),
            metadata={
                "status": data.get("Message"),
                **(metadata or {}),
            },
        )


class TelnyxSmsDeliveryAdapter(SmsDeliveryAdapter):
    """Telnyx Messaging adapter."""

    def __init__(self, api_key: str, messaging_profile_id: str, from_number: str) -> None:
        self._api_key = api_key
        self._messaging_profile_id = messaging_profile_id
        self._from_number = from_number
        self._client = httpx.AsyncClient(
            base_url="https://api.telnyx.com/v2",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=10.0,
        )

    async def send_sms(self, to_number: str, body: str, metadata: Optional[Dict[str, Any]] = None) -> DeliveryResult:
        payload = {
            "from": self._from_number,
            "to": to_number,
            "text": body,
            "messaging_profile_id": self._messaging_profile_id,
        }
        response = await self._client.post("/messages", json=payload)
        response.raise_for_status()
        data = response.json().get("data", {})
        return DeliveryResult(
            success=True,
            provider="telnyx.sms",
            message_id=data.get("id", str(uuid.uuid4())),
            metadata={
                "status": data.get("delivery_status"),
                **(metadata or {}),
            },
        )


class TelnyxVoiceDeliveryAdapter(VoiceDeliveryAdapter):
    """Telnyx Call Control placeholder adapter – real-time integration lands in Playbook 4."""

    def __init__(self, api_key: str, call_control_app_id: Optional[str], from_number: str) -> None:
        self._api_key = api_key
        self._call_control_app_id = call_control_app_id
        self._from_number = from_number

    async def initiate_call(self, to_number: str, script: str, metadata: Optional[Dict[str, Any]] = None) -> DeliveryResult:
        if not self._call_control_app_id:
            raise RuntimeError("TELNYX_CALL_CONTROL_APP_ID is required for voice streaming")

        settings = get_settings()
        if not settings.base_url:
            raise RuntimeError("BASE_URL must be configured for Telnyx media streaming")

        call_identifier = (metadata or {}).get("call_id") or str(uuid.uuid4())
        dial_payload = {
            "connection_id": self._call_control_app_id,
            "to": to_number,
            "from": self._from_number,
            "timeout_secs": 45,
        }

        async with httpx.AsyncClient(
            base_url="https://api.telnyx.com/v2",
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
            },
            timeout=15.0,
        ) as client:
            response = await client.post("/call_control/commands/dial", json=dial_payload)
            response.raise_for_status()
            data = response.json().get("data", {})

            call_control_id = data.get("call_control_id")
            if not call_control_id:
                raise RuntimeError("Telnyx did not return call_control_id")

            stream_url = self._build_stream_url(str(settings.base_url), call_identifier)
            stream_payload = {
                "stream_url": stream_url,
                "audio_format": "pcm16",
            }
            stream_response = await client.post(
                f"/call_control/{call_control_id}/actions/stream_start",
                json=stream_payload,
            )
            stream_response.raise_for_status()

        return DeliveryResult(
            success=True,
            provider="telnyx.voice",
            message_id=call_control_id,
            metadata={
                **(metadata or {}),
                "to": to_number,
                "from": self._from_number,
                "call_control_id": call_control_id,
                "stream_url": stream_url,
                "script": script,
            },
        )

    def _build_stream_url(self, base_url: str, call_id: str) -> str:
        trimmed = base_url.rstrip("/")
        if trimmed.startswith("https://"):
            ws_base = "wss://" + trimmed[len("https://") :]
        elif trimmed.startswith("http://"):
            ws_base = "ws://" + trimmed[len("http://") :]
        else:
            ws_base = trimmed
        return f"{ws_base}/api/voice/stream/{call_id}"


@dataclass
class SequenceDeliveryAdapters:
    email: EmailDeliveryAdapter
    sms: SmsDeliveryAdapter
    voice: VoiceDeliveryAdapter


_cached_adapters: Optional[SequenceDeliveryAdapters] = None


def get_delivery_adapters() -> SequenceDeliveryAdapters:
    """Return configured delivery adapters based on feature flags + credentials."""
    global _cached_adapters

    if _cached_adapters is not None:
        return _cached_adapters

    settings = get_settings()

    if settings.feature_flags.use_mock_sequence_delivery:
        _cached_adapters = SequenceDeliveryAdapters(
            email=MockEmailDeliveryAdapter(),
            sms=MockSmsDeliveryAdapter(),
            voice=MockVoiceDeliveryAdapter(),
        )
        return _cached_adapters

    email_adapter: EmailDeliveryAdapter
    sms_adapter: SmsDeliveryAdapter
    voice_adapter: VoiceDeliveryAdapter

    providers = settings.providers

    if providers.sendgrid_api_key and settings.base_url:
        sender_email = f"no-reply@{settings.base_url.host}" if settings.base_url else "no-reply@fishmouth.ai"
        email_adapter = SendGridEmailDeliveryAdapter(providers.sendgrid_api_key, sender_email)
    elif providers.postmark_api_token and settings.base_url:
        sender_email = f"no-reply@{settings.base_url.host}"
        email_adapter = PostmarkEmailDeliveryAdapter(providers.postmark_api_token, sender_email)
    else:
        email_adapter = MockEmailDeliveryAdapter()

    if providers.telnyx_api_key and providers.telnyx_messaging_profile_id:
        from_number = providers.telnyx_from_number or metadata_from_settings("TELNYX_FROM_NUMBER") or "+15555550123"
        sms_adapter = TelnyxSmsDeliveryAdapter(
            providers.telnyx_api_key,
            providers.telnyx_messaging_profile_id,
            from_number,
        )
        voice_adapter = TelnyxVoiceDeliveryAdapter(
            providers.telnyx_api_key,
            providers.telnyx_call_control_app_id,
            from_number,
        )
    else:
        sms_adapter = MockSmsDeliveryAdapter()
        voice_adapter = MockVoiceDeliveryAdapter()

    _cached_adapters = SequenceDeliveryAdapters(
        email=email_adapter,
        sms=sms_adapter,
        voice=voice_adapter,
    )
    return _cached_adapters


def metadata_from_settings(env_key: str) -> Optional[str]:
    """Fetch supporting environment values without hard-coding them into settings."""
    import os

    return os.getenv(env_key)
