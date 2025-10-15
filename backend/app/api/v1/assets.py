"""Asset helper endpoints for presigning stored imagery and report binaries."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.dependencies.assets import get_asset_service
from app.modules.imagery.asset_service import AssetService
from auth import get_current_user
from models import User


router = APIRouter(prefix="/api/v1/assets", tags=["assets"])


class PresignRequest(BaseModel):
    storage_key: str = Field(..., description="Internal storage key (e.g. lead-assets/abc123/thumb.jpg)")
    expires_sec: int = Field(900, ge=60, le=3600, description="Lifetime of the presigned URL in seconds")


class PresignResponse(BaseModel):
    url: str
    expires_in: int


def _validate_storage_key(storage_key: str) -> str:
    if not storage_key:
        raise HTTPException(status_code=400, detail="storage_key is required")
    key = storage_key.strip().lstrip("/")
    if ".." in key or key.startswith("//"):
        raise HTTPException(status_code=400, detail="Invalid storage key")
    return key


@router.post("/presign", response_model=PresignResponse)
async def presign_asset(
    body: PresignRequest,
    current_user: User = Depends(get_current_user),
    asset_service: AssetService = Depends(get_asset_service),
) -> PresignResponse:
    """Return a short-lived URL for an asset the current user can access."""

    _ = current_user  # reserved for future permission checks
    key = _validate_storage_key(body.storage_key)
    try:
        url = asset_service.presign(key, body.expires_sec)
    except FileNotFoundError as exc:  # pragma: no cover - defensive when using local storage
        raise HTTPException(status_code=404, detail="Asset not found") from exc
    except Exception as exc:  # pragma: no cover - storage backend errors surfaced to caller
        raise HTTPException(status_code=500, detail="Failed to presign asset") from exc
    return PresignResponse(url=url, expires_in=body.expires_sec)
