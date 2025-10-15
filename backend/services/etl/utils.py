"""Normalization helpers for ETL deduplication and consent enforcement."""

from __future__ import annotations

import hashlib
import re
import socket
from typing import Optional
from unicodedata import normalize as unicode_normalize


_NON_ALNUM = re.compile(r"[^0-9A-Za-z]")
_WHITESPACE = re.compile(r"\s+")


def _strip_accents(value: str) -> str:
    normalized = unicode_normalize("NFKD", value)
    return "".join(ch for ch in normalized if ord(ch) < 128)


def canonical_address_key(
    address: Optional[str],
    city: Optional[str] = None,
    state: Optional[str] = None,
    postal_code: Optional[str] = None,
) -> str:
    """Return a stable key representing the property location."""

    parts = [address or "", city or "", state or "", postal_code or ""]
    normalized_parts = []
    for part in parts:
        cleaned = _strip_accents(part).lower()
        cleaned = _NON_ALNUM.sub("", cleaned)
        if cleaned:
            normalized_parts.append(cleaned)
    return "|".join(normalized_parts)


def canonical_name(name: Optional[str]) -> str:
    if not name:
        return ""
    cleaned = _strip_accents(name).lower()
    cleaned = _WHITESPACE.sub(" ", cleaned).strip()
    cleaned = _NON_ALNUM.sub("", cleaned)
    return cleaned


def compute_dedupe_key(owner_name: Optional[str], address_key: str) -> str:
    owner_part = canonical_name(owner_name) or "unknown"
    raw = f"{owner_part}|{address_key}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


def normalize_phone_number(phone: Optional[str], country_code: str = "US") -> Optional[str]:
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if not digits:
        return None
    if country_code == "US":
        if len(digits) == 10:
            digits = "1" + digits
        elif len(digits) == 11 and digits.startswith("1"):
            pass
        else:
            return None
    return f"+{digits}"


def normalize_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    email = email.strip().lower()
    if "@" not in email:
        return None
    local, _, domain = email.partition("@")
    if not local or not domain or "." not in domain:
        return None
    return f"{local}@{domain}"


def verify_email_deliverability(email: Optional[str]) -> bool:
    """Attempt a lightweight SMTP-domain verification without sending mail."""

    if not email:
        return False
    if "@" not in email:
        return False
    _, _, domain = email.partition("@")
    if not domain or "." not in domain:
        return False

    try:
        socket.getaddrinfo(domain, None)
    except socket.gaierror:
        return False
    return True

