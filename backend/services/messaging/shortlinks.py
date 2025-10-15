"""Utility helpers for creating and tracking message shortlinks."""

from __future__ import annotations

import secrets
import string
from typing import Dict, Optional

from config import get_settings

_ALPHABET = string.ascii_letters + string.digits


def generate_code(length: int = 8) -> str:
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


def absolute_url(relative: str) -> str:
    settings = get_settings()
    base = settings.base_url
    if not base:
        return relative
    return f"{str(base).rstrip('/')}{relative}"


def build_shortlink(target: str, *, code: Optional[str] = None) -> Dict[str, str]:
    slug = code or generate_code()
    path = f"/l/{slug}"
    return {
        "code": slug,
        "target": target,
        "url": absolute_url(path),
        "path": path,
    }


__all__ = ["absolute_url", "build_shortlink", "generate_code"]
