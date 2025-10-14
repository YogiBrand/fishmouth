"""Compatibility layer exposing configuration to the new app module structure."""

from typing import TYPE_CHECKING

from config import Settings, get_settings  # type: ignore

__all__ = ["Settings", "get_settings"]


if TYPE_CHECKING:
    # Re-export for type checkers
    Settings = Settings

