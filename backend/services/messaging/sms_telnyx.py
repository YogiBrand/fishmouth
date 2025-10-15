"""Backward-compatible import for Telnyx SMS provider."""

from __future__ import annotations

from .providers import MessagingProviderError, ProviderResult, TelnyxSmsProvider

__all__ = [
    "MessagingProviderError",
    "ProviderResult",
    "TelnyxSmsProvider",
]
