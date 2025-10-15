"""Factory helpers for selecting the appropriate storage backend."""

from __future__ import annotations

from pathlib import Path
from typing import Optional

from config import get_settings

from .local_storage import LocalStorageDriver
from .s3_storage import S3StorageDriver
from .storage_driver import StorageDriver

_driver: Optional[StorageDriver] = None


def _default_local_paths() -> tuple[str, str]:
    base_dir = Path(__file__).resolve().parents[4] / "uploads"
    base_dir.mkdir(parents=True, exist_ok=True)
    return str(base_dir), "/uploads"


def get_storage_driver() -> StorageDriver:
    """Return a singleton storage driver based on configuration."""

    global _driver
    if _driver is not None:
        return _driver

    settings = get_settings()
    storage = settings.storage

    if storage.s3_bucket:
        _driver = S3StorageDriver(
            bucket=storage.s3_bucket,
            region=storage.s3_region or "us-east-1",
            endpoint_url=storage.s3_endpoint_url,
        )
        return _driver

    base_path = str(storage.storage_root) if storage.storage_root else None
    public_base = storage.storage_base_url or "/uploads"
    if not base_path:
        base_path, public_base = _default_local_paths()
    else:
        Path(base_path).mkdir(parents=True, exist_ok=True)

    _driver = LocalStorageDriver(base_path=base_path, public_base=public_base)
    return _driver


def reset_storage_driver() -> None:
    """Reset cached driver (useful for tests)."""

    global _driver
    _driver = None
