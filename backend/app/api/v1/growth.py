"""Growth module endpoints for contractor prospecting."""

from __future__ import annotations

from datetime import datetime
from typing import Dict, Optional

import sqlalchemy as sa
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.database import DatabaseSession, get_db
from app.models import ContractorProspect, ContractorProspectEvent
from services.growth import (
    record_prospect_reply,
    refresh_contractor_prospects,
    run_outreach_batch,
    summarize_prospect_pipeline,
)

router = APIRouter(prefix="/api/v1/growth", tags=["growth"])


class ProspectEventRequest(BaseModel):
    reply_type: str = Field(pattern="^(replied|demo|paid|not_interested)$")
    note: Optional[str] = None


class OutreachRequest(BaseModel):
    channel: str = Field(default="email", pattern="^(email|sms)$")
    batch_size: int = Field(default=25, ge=1, le=100)


@router.get("/summary")
async def summary() -> Dict[str, object]:
    return summarize_prospect_pipeline()


@router.post("/refresh")
async def refresh() -> Dict[str, int]:
    return refresh_contractor_prospects()


@router.post("/outreach")
async def run_outreach(body: OutreachRequest) -> Dict[str, object]:
    result = run_outreach_batch(batch_size=body.batch_size, channel=body.channel)
    return {**result, "pipeline": summarize_prospect_pipeline()}


@router.get("/prospects")
async def list_prospects(
    status: Optional[str] = None,
    limit: int = 50,
    db: DatabaseSession = Depends(get_db),
) -> Dict[str, object]:
    query = sa.text(
        """
        SELECT id, company_name, contact_name, email, phone, city, state, score,
               status, sequence_stage, reply_status, last_contacted_at, last_reply_at
        FROM contractor_prospects
        {where}
        ORDER BY score DESC
        LIMIT :limit
        """
    )
    where_clause = ""
    params: Dict[str, object] = {"limit": limit}
    if status:
        where_clause = "WHERE status = :status"
        params["status"] = status
    query = sa.text(query.text.replace("{where}", where_clause))
    rows = await db.fetch_all(query, params)
    await db.close()
    return {"prospects": rows}


@router.post("/prospects/{prospect_id}/events", status_code=202)
async def record_event(prospect_id: str, body: ProspectEventRequest):
    if not record_prospect_reply(prospect_id, reply_type=body.reply_type, note=body.note):
        raise HTTPException(status_code=404, detail="Prospect not found")
    return {"ok": True}


@router.get("/prospects/{prospect_id}")
async def prospect_detail(prospect_id: str, db: DatabaseSession = Depends(get_db)) -> Dict[str, object]:
    row = await db.fetch_one(
        sa.text(
            """
            SELECT * FROM contractor_prospects WHERE id = :id
            """
        ),
        {"id": prospect_id},
    )
    if not row:
        await db.close()
        raise HTTPException(status_code=404, detail="Prospect not found")

    events = await db.fetch_all(
        sa.text(
            """
            SELECT type, payload, occurred_at
            FROM contractor_prospect_events
            WHERE prospect_id = :id
            ORDER BY occurred_at DESC
            LIMIT 50
            """
        ),
        {"id": prospect_id},
    )
    await db.close()
    return {"prospect": row, "events": events}
