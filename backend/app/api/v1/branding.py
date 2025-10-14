"""Branding endpoints for contractor assets and showcases."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.services.branding_service import BrandingToolkitService

router = APIRouter(prefix="/api/v1/branding", tags=["branding"])


@router.get("/profile/{contractor_id}")
async def get_profile(contractor_id: str):
    profile = await BrandingToolkitService.get_contractor_profile(contractor_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Contractor not found")
    return profile


@router.post("/showcase/{contractor_id}")
async def generate_showcase(contractor_id: str):
    result = await BrandingToolkitService.generate_showcase(contractor_id)
    return result
