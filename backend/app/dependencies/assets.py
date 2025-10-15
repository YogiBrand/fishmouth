"""Dependency helpers for asset and storage services."""

from __future__ import annotations

from functools import lru_cache

from app.modules.imagery.asset_service import AssetService
from app.modules.storage.factory import get_storage_driver


@lru_cache(maxsize=1)
def get_asset_service() -> AssetService:
    """Return a cached instance of the asset service."""

    return AssetService(get_storage_driver())
