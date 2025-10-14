"""Endpoints controlling the AI voice agent."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from app.services.ai_voice_agent import AIVoiceAgentService

router = APIRouter(prefix="/api/v1/ai-voice", tags=["ai-voice"])


@router.post("/campaign")
async def launch_campaign(payload: dict):
    lead_ids: List[str] = payload.get("lead_ids") or []
    contractor_id: str = payload.get("contractor_id")
    campaign_name: str = payload.get("campaign_name", "Neighborhood Outreach")

    if not lead_ids or not contractor_id:
        raise HTTPException(status_code=400, detail="lead_ids and contractor_id are required")

    service = AIVoiceAgentService()
    result = await service.create_call_campaign(lead_ids, contractor_id, campaign_name=campaign_name)
    return result


@router.post("/follow-up")
async def schedule_follow_up(payload: dict):
    lead_id: str = payload.get("lead_id")
    sequence_type: str = payload.get("sequence_type", "no_answer")

    if not lead_id:
        raise HTTPException(status_code=400, detail="lead_id is required")

    service = AIVoiceAgentService()
    await service.send_followup_sequence(lead_id, sequence_type=sequence_type)
    return {"status": "queued"}
