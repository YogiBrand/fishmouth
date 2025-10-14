"""Shared voice service dataclasses."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass
class ConversationTurn:
    """Represents a single exchange within a voice conversation."""

    role: str  # "assistant" or "user" or "agent"
    content: str
    audio_url: Optional[str] = None
