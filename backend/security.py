"""Security utilities for hashing and masking PII."""

from __future__ import annotations

import hashlib
from typing import Optional

from config import get_settings


def hash_pii(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    settings = get_settings()
    salt = getattr(settings, "pii_hash_salt", "")
    digest = hashlib.sha256((salt + value).encode("utf-8")).hexdigest()
    return digest
