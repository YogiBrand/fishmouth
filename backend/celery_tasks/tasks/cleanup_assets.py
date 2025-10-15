"""Periodic cleanup for short-lived imagery overlays and cached tiles."""

from __future__ import annotations

import os
import time
from datetime import datetime, timedelta
from pathlib import Path

from celery import shared_task

from app.modules.storage.factory import get_storage_driver


@shared_task(name="assets.cleanup_overlays")
def expire_assets(prefix: str = "overlays/", ttl_days: int = 30) -> dict:
    """Remove stale overlay files for local storage backends."""

    driver = get_storage_driver()
    # S3/R2 lifecycle policies should handle expiry automatically.
    # Only attempt manual cleanup for LocalStorageDriver instances.
    if driver.__class__.__name__ != "LocalStorageDriver":
        return {"handled_by": "bucket_lifecycle"}

    local_base = Path(driver.base_path)  # type: ignore[attr-defined]
    target_dir = (local_base / prefix).resolve()
    if not target_dir.exists():
        return {"removed": 0}

    threshold = datetime.utcnow() - timedelta(days=ttl_days)
    removed = 0
    for root, _, files in os.walk(target_dir):
        for filename in files:
            path = Path(root) / filename
            try:
                if datetime.utcfromtimestamp(path.stat().st_mtime) < threshold:
                    path.unlink(missing_ok=True)
                    removed += 1
            except FileNotFoundError:  # pragma: no cover - race conditions during cleanup
                continue
    return {"removed": removed, "base": str(target_dir)}
