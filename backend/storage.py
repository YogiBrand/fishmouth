"""Utilities for storing binary assets locally or in object storage."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from config import get_settings

settings = get_settings()


def _local_storage_path(filename: str) -> Path:
    storage_dir = Path(settings.storage.storage_root)
    storage_dir.mkdir(parents=True, exist_ok=True)
    path = storage_dir / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def save_binary(data: bytes, filename: str, content_type: Optional[str] = None) -> str:
    """Persist bytes to either S3 (if configured) or local disk.

    Returns a URL suitable for storing in the database.
    """

    storage = settings.storage
    if storage.s3_bucket and storage.s3_access_key_id and storage.s3_secret_access_key:
        session = boto3.session.Session(
            aws_access_key_id=storage.s3_access_key_id,
            aws_secret_access_key=storage.s3_secret_access_key,
            region_name=storage.s3_region,
        )
        client = session.client("s3", endpoint_url=storage.s3_endpoint_url)
        key = f"imagery/{filename}"
        extra_args = {"ContentType": content_type or "application/octet-stream"}
        try:
            client.put_object(Bucket=storage.s3_bucket, Key=key, Body=data, **extra_args)
        except (ClientError, BotoCoreError) as exc:
            # Fall back to local storage on failure
            path = _local_storage_path(filename)
            path.write_bytes(data)
            return _build_public_url(filename)

        if storage.storage_base_url:
            return f"{storage.storage_base_url.rstrip('/')}/{key}"
        return f"s3://{storage.s3_bucket}/{key}"

    path = _local_storage_path(filename)
    path.write_bytes(data)
    return _build_public_url(filename)


def _build_public_url(filename: str) -> str:
    if settings.storage.storage_base_url:
        return f"{settings.storage.storage_base_url.rstrip('/')}/{filename}"
    return f"/uploads/aerial/{filename}"


def hashed_filename(prefix: str, *parts: str, suffix: str = "") -> str:
    digest = hashlib.sha1("::".join(parts).encode("utf-8")).hexdigest()
    if suffix and not suffix.startswith("."):
        suffix = "." + suffix
    return f"{prefix}-{digest}{suffix}"
