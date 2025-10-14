"""Direct mail campaign endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException

from app.services.mail_service import MailService

router = APIRouter(prefix="/api/v1/mailers", tags=["mailers"])


@router.get("/templates")
async def list_templates():
    return {"templates": await MailService.list_templates()}


@router.post("/campaigns")
async def create_campaign(payload: dict):
    contractor_id: Optional[str] = payload.get("contractor_id")
    name: str = payload.get("name", "Direct Mail Outreach")
    template_key: str = payload.get("template_key", "impact")
    lead_ids: List[str] = payload.get("lead_ids") or []
    schedule_for = payload.get("schedule_for")

    if not contractor_id or not lead_ids:
        raise HTTPException(status_code=400, detail="contractor_id and lead_ids are required")

    schedule_dt = datetime.fromisoformat(schedule_for) if schedule_for else None
    try:
        result = await MailService.create_campaign(contractor_id, name, template_key, lead_ids, schedule_dt)
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/campaigns/{campaign_id}/submit")
async def submit_campaign(campaign_id: str):
    try:
        return await MailService.submit_campaign(campaign_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
