"""Utilities for encrypting and decrypting sensitive fields."""

from __future__ import annotations

from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

from config import get_settings


def _get_cipher() -> Optional[Fernet]:
    key = get_settings().pii_encryption_key
    if not key:
        return None
    try:
        return Fernet(key.encode("utf-8"))
    except Exception:  # pragma: no cover - invalid configuration
        return None


def encrypt_value(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    cipher = _get_cipher()
    if not cipher:
        return value
    token = cipher.encrypt(value.encode("utf-8"))
    return token.decode("utf-8")


def decrypt_value(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    cipher = _get_cipher()
    if not cipher:
        return value
    try:
        return cipher.decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken:
        return value
