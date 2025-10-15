"""Template management endpoints for scoped content."""

from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.services import template_service

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])


class TemplatePayload(BaseModel):
    scope: Optional[str] = Field(None, description="Template scope: report, email, or sms")
    content: str = Field(..., description="Template body with tokens")
    is_system: bool = Field(default=False, description="Marks template as system-provided")


class TemplatePreviewData(BaseModel):
    lead_id: Optional[str] = Field(None, description="Lead identifier for token context")
    report_id: Optional[str] = Field(None, description="Report identifier for token context")
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Explicit token context override {lead:{}, company:{}, ...}",
    )


class TemplatePreviewRequest(BaseModel):
    template_id: str
    data: TemplatePreviewData = Field(default_factory=TemplatePreviewData)


@router.get("")
async def list_templates():
    db = await get_db()
    try:
        templates = await template_service.list_templates(db)
        return {"templates": templates}
    finally:
        await db.close()


async def _save_template(template_id: str, payload: TemplatePayload):
    db = await get_db()
    try:
        existing = await template_service.get_template(db, template_id)
        scope = payload.scope or (existing.get("scope") if existing else None)
        if scope is None:
            raise HTTPException(status_code=400, detail="scope is required for new templates")

        try:
            record = await template_service.save_template(
                db,
                template_id=template_id,
                scope=scope,
                content=payload.content,
                is_system=payload.is_system if payload.scope is not None else existing.get("is_system", False),
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        await db.commit()
        return record
    finally:
        await db.close()


@router.post("/preview")
async def preview_template(payload: TemplatePreviewRequest):
    db = await get_db()
    try:
        try:
            result = await template_service.preview_template(
                db,
                template_id=payload.template_id,
                lead_id=payload.data.lead_id,
                report_id=payload.data.report_id,
                context_override=payload.data.context,
            )
        except ValueError as exc:
            status = 404 if "not found" in str(exc).lower() else 400
            raise HTTPException(status_code=status, detail=str(exc)) from exc
        return result
    finally:
        await db.close()


@router.post("/{template_id}")
async def create_template(template_id: str, payload: TemplatePayload):
    record = await _save_template(template_id, payload)
    return record


@router.put("/{template_id}")
async def update_template(template_id: str, payload: TemplatePayload):
    record = await _save_template(template_id, payload)
    return record
