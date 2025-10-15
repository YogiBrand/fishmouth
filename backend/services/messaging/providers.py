"""Messaging provider adapters for SendGrid email and Telnyx SMS."""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)


class MessagingProviderError(RuntimeError):
    """Raised when an upstream provider returns an error."""


@dataclass
class ProviderResult:
    provider: str
    message_id: Optional[str]
    status: str
    payload: Dict[str, Any]
    dry_run: bool = False


class SendGridEmailProvider:
    """Minimal SendGrid adapter supporting HTML/text bodies and attachments."""

    def __init__(
        self,
        api_key: Optional[str],
        sender: str,
        *,
        dry_run: bool = True,
        categories: Optional[List[str]] = None,
        timeout_seconds: float = 10.0,
    ) -> None:
        self.api_key = api_key or ""
        self.sender = sender
        self.dry_run = dry_run or not bool(api_key)
        self.categories = categories or []
        self.timeout_seconds = timeout_seconds

    def _build_payload(
        self,
        to_address: str,
        subject: Optional[str],
        html: Optional[str],
        text: Optional[str],
        attachments: Optional[List[Dict[str, Any]]],
        headers: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        content: List[Dict[str, str]] = []
        if text:
            content.append({"type": "text/plain", "value": text})
        if html:
            content.append({"type": "text/html", "value": html})
        if not content:
            content.append({"type": "text/plain", "value": ""})

        payload: Dict[str, Any] = {
            "personalizations": [
                {
                    "to": [{"email": to_address}],
                    "dynamic_template_data": {},
                }
            ],
            "from": {"email": self.sender},
            "subject": subject or "",
            "content": content,
        }

        if headers:
            payload["headers"] = headers
        if self.categories:
            payload["categories"] = self.categories

        encoded_attachments: List[Dict[str, Any]] = []
        for attachment in attachments or []:
            raw_content = attachment.get("content")
            if not raw_content:
                continue
            if isinstance(raw_content, bytes):
                encoded = base64.b64encode(raw_content).decode("utf-8")
            elif _looks_base64(raw_content):
                encoded = raw_content
            else:
                encoded = base64.b64encode(str(raw_content).encode("utf-8")).decode("utf-8")

            encoded_attachments.append(
                {
                    "content": encoded,
                    "filename": attachment.get("filename", "attachment"),
                    "type": attachment.get("type", "application/octet-stream"),
                    "disposition": attachment.get("disposition", "attachment"),
                }
            )

        if encoded_attachments:
            payload["attachments"] = encoded_attachments

        return payload

    def send(
        self,
        to_address: str,
        subject: Optional[str],
        html: Optional[str],
        text: Optional[str],
        attachments: Optional[List[Dict[str, Any]]] = None,
        headers: Optional[Dict[str, str]] = None,
        custom_args: Optional[Dict[str, Any]] = None,
    ) -> ProviderResult:
        payload = self._build_payload(to_address, subject, html, text, attachments, headers)
        if custom_args:
            payload.setdefault("personalizations", [{}])[0]["custom_args"] = custom_args
        if self.dry_run:
            logger.info(
                "sendgrid.dry_run",
                extra={"to": to_address, "subject": subject, "has_attachments": bool(attachments)},
            )
            return ProviderResult(
                provider="sendgrid",
                message_id="dryrun",
                status="queued",
                payload=payload,
                dry_run=True,
            )

        if not self.api_key:
            raise MessagingProviderError("SendGrid API key missing and dry_run disabled")

        headers_dict = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    json=payload,
                    headers=headers_dict,
                )
        except httpx.HTTPError as exc:  # pragma: no cover - network failure path
            raise MessagingProviderError(f"SendGrid request failed: {exc}") from exc

        if response.status_code >= 400:
            raise MessagingProviderError(
                f"SendGrid returned {response.status_code}: {response.text}"
            )

        message_id = response.headers.get("X-Message-Id") or response.headers.get("x-message-id")
        return ProviderResult(
            provider="sendgrid",
            message_id=message_id,
            status="accepted" if response.status_code == 202 else str(response.status_code),
            payload=payload,
        )


class TelnyxSmsProvider:
    """Telnyx SMS adapter with optional messaging profile support."""

    def __init__(
        self,
        api_key: Optional[str],
        *,
        from_number: str,
        messaging_profile_id: Optional[str] = None,
        dry_run: bool = True,
        timeout_seconds: float = 10.0,
    ) -> None:
        self.api_key = api_key or ""
        self.from_number = from_number
        self.messaging_profile_id = messaging_profile_id
        self.dry_run = dry_run or not bool(api_key)
        self.timeout_seconds = timeout_seconds

    def send(
        self,
        to_number: str,
        text: str,
        tags: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> ProviderResult:
        payload: Dict[str, Any] = {
            "from": self.from_number,
            "to": to_number,
            "text": text,
        }
        if self.messaging_profile_id:
            payload["messaging_profile_id"] = self.messaging_profile_id
        if tags:
            if isinstance(tags, dict):
                payload["tags"] = [f"{key}:{value}" for key, value in tags.items()]
            else:
                payload["tags"] = tags
        if metadata:
            payload["metadata"] = metadata

        if self.dry_run:
            logger.info(
                "telnyx.dry_run",
                extra={"to": to_number, "length": len(text)},
            )
            return ProviderResult(
                provider="telnyx",
                message_id="dryrun",
                status="queued",
                payload=payload,
                dry_run=True,
            )

        if not self.api_key:
            raise MessagingProviderError("Telnyx API key missing and dry_run disabled")

        headers_dict = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.post(
                    "https://api.telnyx.com/v2/messages",
                    json=payload,
                    headers=headers_dict,
                )
        except httpx.HTTPError as exc:  # pragma: no cover - network failure path
            raise MessagingProviderError(f"Telnyx request failed: {exc}") from exc

        if response.status_code >= 400:
            raise MessagingProviderError(
                f"Telnyx returned {response.status_code}: {response.text}"
            )

        data = response.json().get("data", {}) if response.content else {}
        message_id = data.get("id")
        status = data.get("delivery_status") or data.get("type") or str(response.status_code)
        return ProviderResult(
            provider="telnyx",
            message_id=message_id,
            status=status,
            payload=payload,
        )


def _looks_base64(value: Any) -> bool:
    if not isinstance(value, str):
        return False
    if not value:
        return False
    try:
        base64.b64decode(value.encode("utf-8"), validate=True)
        return True
    except Exception:
        return False


__all__ = [
    "MessagingProviderError",
    "ProviderResult",
    "SendGridEmailProvider",
    "TelnyxSmsProvider",
]
