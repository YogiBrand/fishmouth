"""Backward-compatible import for SendGrid email provider."""

from __future__ import annotations

from .providers import MessagingProviderError, ProviderResult, SendGridEmailProvider

__all__ = [
    "MessagingProviderError",
    "ProviderResult",
    "SendGridEmailProvider",
]
