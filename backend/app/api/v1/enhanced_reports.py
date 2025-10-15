"""Enhanced report generation endpoints with AI integration and branding."""

from __future__ import annotations

import base64
import secrets
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import sqlalchemy as sa
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.database import get_db
from app.services.enhanced_report_renderer import (
    EnhancedReportRenderer,
    ensure_reports_directory,
)
from app.services.report_content_generator import (
    ReportContentGenerator,
    build_prompt_signature,
)
from app.utils.report_tokens import resolve_report_tokens
from services.sequence_delivery import get_delivery_adapters
from weasyprint import HTML

router = APIRouter(prefix="/api/v1/reports", tags=["enhanced-reports"])
renderer = EnhancedReportRenderer()
content_generator = ReportContentGenerator()
settings = get_settings()
@router.get("")
async def list_reports(limit: int = 20):
    """List recent reports for the authenticated user if available, otherwise global recent."""
    db = await get_db()
    try:
        await _ensure_optional_columns(db)
        rows = await db.fetch_all(
            sa.text(
                """
                SELECT id, lead_id, type, status, created_at, updated_at, thumbnail_url, share_url, pdf_url, preview_url
                FROM reports
                ORDER BY created_at DESC
                LIMIT :limit
                """
            ),
            {"limit": limit},
        )
        return [
            {
                "id": r["id"],
                "lead_id": r["lead_id"],
                "type": r["type"],
                "status": r["status"],
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
                "thumbnail_url": r.get("thumbnail_url"),
                "share_url": r.get("share_url"),
                "pdf_url": r.get("pdf_url"),
                "preview_url": r.get("preview_url"),
            }
            for r in rows
        ]
    finally:
        await db.close()


class ReportConfig(BaseModel):
    """Report configuration model."""
    type: str = Field(..., description="Report type (damage-assessment, inspection-report, etc.)")
    template: str = Field(default="professional", description="Template style")
    sections: Dict[str, Dict[str, Any]] = Field(default_factory=dict, description="Section configuration")
    branding: Dict[str, Any] = Field(default_factory=dict, description="Branding configuration")
    customizations: Dict[str, Any] = Field(default_factory=dict, description="Custom styling")


class ReportCreate(BaseModel):
    """Create report request model."""
    lead_id: str
    config: ReportConfig
    content: Optional[Dict[str, str]] = Field(default_factory=dict)
    business_profile: Optional[Dict[str, Any]] = Field(default_factory=dict)
    thumbnail_data: Optional[str] = None


class ReportUpdate(BaseModel):
    """Update report request model."""
    config: Optional[ReportConfig] = None
    content: Optional[Dict[str, str]] = None
    business_profile: Optional[Dict[str, Any]] = None
    thumbnail_data: Optional[str] = None


class AIContentGeneration(BaseModel):
    """AI content generation request model."""
    prompt: str
    section: str
    lead_id: Optional[str] = None
    report_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = Field(default_factory=dict)
    force_refresh: bool = Field(default=False, description="Ignore cached generations and call the AI provider")


class ReportSend(BaseModel):
    """Send report request model."""
    lead_id: str
    method: str = Field(default="email", description="Delivery method: email, sms, link")
    message: Optional[str] = None


def _persist_thumbnail(report_id: str, thumbnail_data: Optional[str]) -> Optional[str]:
    if not thumbnail_data:
        return None

    try:
        _, separator, encoded = thumbnail_data.partition(",")
        payload = encoded if separator else thumbnail_data
        binary = base64.b64decode(payload)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to decode thumbnail for report {report_id}: {exc}")
        return None

    thumbnails_dir = Path("uploads") / "report-thumbnails"
    thumbnails_dir.mkdir(parents=True, exist_ok=True)
    file_path = thumbnails_dir / f"{report_id}.png"

    try:
        file_path.write_bytes(binary)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to write thumbnail for report {report_id}: {exc}")
        return None

    return f"/uploads/report-thumbnails/{file_path.name}"


async def _ensure_share_link(db, report_id: str, share_token: Optional[str], share_url: Optional[str]) -> Dict[str, str]:
    if share_token:
        record = await db.fetch_one(
            sa.text("SELECT token, revoked FROM public_shares WHERE token = :token"),
            {"token": share_token},
        )
        if record and not record.get("revoked"):
            return {"token": record["token"], "url": share_url or f"/r/{record['token']}"}

    token = secrets.token_hex(16)
    url = f"/r/{token}"
    now = datetime.utcnow()

    await db.execute(
        sa.text(
            """
            INSERT INTO public_shares (id, report_id, token, revoked, created_at)
            VALUES (:id, :report_id, :token, FALSE, :created_at)
            """
        ),
        {
            "id": str(uuid.uuid4()),
            "report_id": report_id,
            "token": token,
            "created_at": now,
        },
    )

    await db.execute(
        sa.text(
            """
            UPDATE reports
            SET share_token = :token, share_url = :url, updated_at = :updated_at
            WHERE id = :report_id
            """
        ),
        {
            "token": token,
            "url": url,
            "report_id": report_id,
            "updated_at": now,
        },
    )
    await db.commit()

    return {"token": token, "url": url}


async def _ensure_optional_columns(db) -> None:
    """Make sure soft columns exist when migrations are unavailable."""
    try:
        await db.execute(
            sa.text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS thumbnail_url VARCHAR(500)")
        )
        await db.execute(
            sa.text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS share_token VARCHAR(128)")
        )
        await db.execute(
            sa.text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS preview_url VARCHAR(500)")
        )
        await db.execute(
            sa.text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS render_checksum VARCHAR(128)")
        )
        await db.execute(
            sa.text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS render_html_path VARCHAR(500)")
        )
        await db.execute(
            sa.text("ALTER TABLE reports ADD COLUMN IF NOT EXISTS rendered_at TIMESTAMP")
        )
        await db.commit()
    except Exception as exc:  # noqa: BLE001
        # Safe to ignore if database backend lacks ALTER TABLE support or permissions.
        print(f"Optional column check failed: {exc}")


@router.post("/")
async def create_report(report_data: ReportCreate):
    """Create a new report with unique ID."""
    db = await get_db()
    try:
        await _ensure_optional_columns(db)
        report_id = str(uuid.uuid4())
        created_at = datetime.utcnow()

        lead_row = await db.fetch_one(
            sa.text("SELECT * FROM leads WHERE id = :lead_id"),
            {"lead_id": report_data.lead_id},
        )

        if not lead_row:
            raise HTTPException(status_code=404, detail="Lead not found")

        lead_data = dict(lead_row)
        config_payload = report_data.config.dict()
        business_profile_payload = report_data.business_profile or {}

        resolved_content = resolve_report_tokens(
            content=report_data.content,
            config=config_payload,
            lead=lead_data,
            business_profile=business_profile_payload,
        )

        thumbnail_url = _persist_thumbnail(report_id, report_data.thumbnail_data)

        # Insert report into database
        await db.execute(
            sa.text("""
                INSERT INTO reports (
                    id, lead_id, type, config, content, business_profile,
                    thumbnail_url, share_token, share_url,
                    status, created_at, updated_at
                ) VALUES (
                    :id, :lead_id, :type, :config, :content, :business_profile,
                    :thumbnail_url, :share_token, :share_url,
                    'draft', :created_at, :updated_at
                )
            """),
            {
                "id": report_id,
                "lead_id": report_data.lead_id,
                "type": report_data.config.type,
                "config": config_payload,
                "content": resolved_content,
                "business_profile": business_profile_payload,
                "thumbnail_url": thumbnail_url,
                "share_token": None,
                "share_url": None,
                "created_at": created_at,
                "updated_at": created_at,
            }
        )

        share = await _ensure_share_link(db, report_id, None, None)
        share_url = share["url"]

        # Create activity entry
        await db.execute(
            sa.text("""
                INSERT INTO activity_feed (
                    type, title, message, lead_id, metadata, timestamp
                ) VALUES (
                    'report_created', 'Report Created', :message, :lead_id, :metadata, :timestamp
                )
            """),
            {
                "message": f"New {report_data.config.type.replace('-', ' ')} report created",
                "lead_id": report_data.lead_id,
                "metadata": {
                    "report_id": report_id,
                    "report_type": report_data.config.type,
                    "share_url": share_url,
                    "thumbnail_url": thumbnail_url,
                },
                "timestamp": created_at,
            }
        )

        await db.commit()

        return {
            "id": report_id,
            "status": "created",
            "message": "Report created successfully",
            "view_url": f"/reports/view/{report_id}",
            "share_url": share_url,
            "thumbnail_url": thumbnail_url,
        }

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create report: {str(e)}")
    finally:
        await db.close()


@router.get("/{report_id}")
async def get_report(report_id: str):
    """Get report by ID."""
    db = await get_db()
    try:
        await _ensure_optional_columns(db)
        report = await db.fetch_one(
            sa.text("""
                SELECT * FROM reports WHERE id = :report_id
            """),
            {"report_id": report_id}
        )
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        rendered_at = report.get("rendered_at")
        fallback_share_url = None
        if report.get("share_token"):
            fallback_share_url = f"/r/{report['share_token']}"
        return {
            "id": report["id"],
            "lead_id": report["lead_id"],
            "type": report["type"],
            "config": report["config"],
            "content": report["content"],
            "business_profile": report["business_profile"],
            "status": report["status"],
            "created_at": report["created_at"],
            "updated_at": report["updated_at"],
            "share_url": report.get("share_url") or fallback_share_url,
            "thumbnail_url": report.get("thumbnail_url"),
            "pdf_url": report.get("pdf_url"),
            "preview_url": report.get("preview_url"),
            "rendered_at": rendered_at.isoformat() if rendered_at else None,
            "render_checksum": report.get("render_checksum"),
            "render_html_path": report.get("render_html_path"),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get report: {str(e)}")
    finally:
        await db.close()


@router.put("/{report_id}")
async def update_report(report_id: str, update_data: ReportUpdate):
    """Update report content and configuration."""
    db = await get_db()
    try:
        await _ensure_optional_columns(db)
        # Load existing report details
        existing = await db.fetch_one(
            sa.text("SELECT * FROM reports WHERE id = :report_id"),
            {"report_id": report_id},
        )

        if not existing:
            raise HTTPException(status_code=404, detail="Report not found")

        lead_row = await db.fetch_one(
            sa.text("SELECT * FROM leads WHERE id = :lead_id"),
            {"lead_id": existing["lead_id"]},
        )

        lead_data = dict(lead_row) if lead_row else None
        current_config = existing.get("config") or {}
        current_business_profile = existing.get("business_profile") or {}

        if update_data.config is not None:
            config_payload = update_data.config.dict()
        else:
            config_payload = current_config

        if update_data.business_profile is not None:
            business_profile_payload = update_data.business_profile or {}
        else:
            business_profile_payload = current_business_profile

        needs_content_update = any(
            [
                update_data.content is not None,
                update_data.config is not None,
                update_data.business_profile is not None,
            ]
        )

        content_source = (
            update_data.content if update_data.content is not None else existing.get("content") or {}
        )

        if needs_content_update:
            resolved_content = resolve_report_tokens(
                content=content_source,
                config=config_payload,
                lead=lead_data,
                business_profile=business_profile_payload,
            )
        else:
            resolved_content = existing.get("content")

        thumbnail_url = None
        if update_data.thumbnail_data:
            thumbnail_url = _persist_thumbnail(report_id, update_data.thumbnail_data)

        update_fields: List[str] = []
        update_values: Dict[str, Any] = {
            "report_id": report_id,
            "updated_at": datetime.utcnow(),
        }

        if update_data.config is not None:
            update_fields.append("config = :config")
            update_values["config"] = config_payload

        if update_data.business_profile is not None:
            update_fields.append("business_profile = :business_profile")
            update_values["business_profile"] = business_profile_payload

        if needs_content_update:
            update_fields.append("content = :content")
            update_values["content"] = resolved_content

        if thumbnail_url:
            update_fields.append("thumbnail_url = :thumbnail_url")
            update_values["thumbnail_url"] = thumbnail_url

        if update_fields:
            query = f"""
                UPDATE reports
                SET {', '.join(update_fields)}, updated_at = :updated_at
                WHERE id = :report_id
            """
            await db.execute(sa.text(query), update_values)
            await db.commit()

        return await get_report(report_id)

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update report: {str(e)}")
    finally:
        await db.close()


@router.post("/generate-content")
async def generate_ai_content(content_request: AIContentGeneration):
    """Generate AI content for report sections with caching."""

    db = await get_db()
    try:
        context = content_request.context or {}
        signature = build_prompt_signature(
            content_request.section,
            content_request.prompt,
            context,
        )

        if not content_request.force_refresh:
            cached = await db.fetch_one(
                sa.text(
                    """
                    SELECT content, model_used, generation_time_ms, tokens_used, timestamp
                    FROM ai_generations
                    WHERE prompt_signature = :signature
                    ORDER BY timestamp DESC
                    LIMIT 1
                    """
                ),
                {"signature": signature},
            )
            if cached and cached.get("content"):
                return {
                    "content": cached["content"],
                    "section": content_request.section,
                    "generated_at": (cached.get("timestamp") or datetime.utcnow()).isoformat(),
                    "model": cached.get("model_used"),
                    "cached": True,
                }

        generation_context = dict(context)
        generation_context.setdefault(
            "report_type",
            content_request.context.get("report_type") if content_request.context else None,
        )

        generated_content, meta = await content_generator.generate_section(
            content_request.section,
            content_request.prompt,
            generation_context,
        )

        await db.execute(
            sa.text(
                """
                INSERT INTO ai_generations (
                    section, prompt, content, report_id, lead_id,
                    model_used, generation_time_ms, tokens_used,
                    prompt_signature, timestamp
                ) VALUES (
                    :section, :prompt, :content, :report_id, :lead_id,
                    :model_used, :generation_time_ms, :tokens_used,
                    :prompt_signature, :timestamp
                )
                """
            ),
            {
                "section": content_request.section,
                "prompt": content_request.prompt,
                "content": generated_content,
                "report_id": content_request.report_id,
                "lead_id": content_request.lead_id,
                "model_used": meta.get("model"),
                "generation_time_ms": meta.get("duration_ms"),
                "tokens_used": meta.get("tokens"),
                "prompt_signature": signature,
                "timestamp": datetime.utcnow(),
            },
        )
        await db.commit()

        return {
            "content": generated_content,
            "section": content_request.section,
            "generated_at": datetime.utcnow().isoformat(),
            "model": meta.get("model"),
            "cached": False,
        }

    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate AI content: {exc}")
    finally:
        await db.close()


@router.post("/{report_id}/generate-pdf")
async def generate_pdf(report_id: str, background_tasks: BackgroundTasks):
    """Generate PDF version of report."""
    db = await get_db()
    try:
        await _ensure_optional_columns(db)
        report = await db.fetch_one(
            sa.text("SELECT * FROM reports WHERE id = :report_id"),
            {"report_id": report_id}
        )
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        lead_payload = None
        if report.get("lead_id"):
            lead_row = await db.fetch_one(
                sa.text("SELECT * FROM leads WHERE id = :lead_id"),
                {"lead_id": report["lead_id"]},
            )
            if lead_row:
                lead_payload = dict(lead_row)

        background_tasks.add_task(
            _generate_pdf_background,
            report_id,
            report["config"],
            report["content"],
            report["business_profile"],
            lead_payload,
        )
        
        return {
            "status": "generating",
            "message": "PDF generation started",
            "report_id": report_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start PDF generation: {str(e)}")
    finally:
        await db.close()


@router.post("/{report_id}/share")
async def create_share_link(report_id: str):
    db = await get_db()
    try:
        await _ensure_optional_columns(db)
        report = await db.fetch_one(
            sa.text("SELECT share_token, share_url FROM reports WHERE id = :report_id"),
            {"report_id": report_id},
        )

        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        share = await _ensure_share_link(db, report_id, report.get("share_token"), report.get("share_url"))
        base_url = str(settings.base_url) if settings.base_url else None
        full_url = f"{base_url}{share['url']}" if base_url else share["url"]

        return {
            "share_token": share["token"],
            "share_url": share["url"],
            "share_url_full": full_url,
        }
    finally:
        await db.close()


@router.get("/shared/{share_token}")
async def get_shared_report(share_token: str):
    db = await get_db()
    try:
        await _ensure_optional_columns(db)
        share = await db.fetch_one(
            sa.text(
                """
                SELECT r.id, r.lead_id, r.type, r.config, r.content, r.business_profile, r.status,
                       r.created_at, r.updated_at, r.thumbnail_url, r.pdf_url, r.share_url,
                       r.preview_url, r.rendered_at, r.render_checksum, r.render_html_path,
                       ps.revoked, ps.expires_at
                FROM public_shares ps
                JOIN reports r ON r.id = ps.report_id
                WHERE ps.token = :token
                ORDER BY ps.created_at DESC
                LIMIT 1
                """
            ),
            {"token": share_token},
        )

        legacy = False
        if not share:
            share = await db.fetch_one(
                sa.text(
                    """
                    SELECT id, lead_id, type, config, content, business_profile, status,
                           created_at, updated_at, thumbnail_url, pdf_url, share_url,
                           preview_url, rendered_at, render_checksum, render_html_path,
                           0 AS revoked, NULL AS expires_at
                    FROM reports
                    WHERE share_token = :token
                    """
                ),
                {"token": share_token},
            )
            legacy = True

        if not share:
            raise HTTPException(status_code=404, detail="Shared report not found")

        if not legacy:
            if share.get("revoked"):
                raise HTTPException(status_code=410, detail="Share revoked")
            expires_at = share.get("expires_at")
            if expires_at and isinstance(expires_at, datetime) and expires_at < datetime.utcnow():
                raise HTTPException(status_code=410, detail="Share expired")

        lead_summary = None
        if share.get("lead_id"):
            lead_row = await db.fetch_one(
                sa.text(
                    """
                    SELECT id, homeowner_name, name, address, city, state, zip_code, phone, email
                    FROM leads WHERE id = :lead_id
                    """
                ),
                {"lead_id": share["lead_id"]},
            )
            if lead_row:
                lead_summary = {
                    "id": lead_row["id"],
                    "name": lead_row.get("homeowner_name") or lead_row.get("name"),
                    "address": lead_row.get("address"),
                    "city": lead_row.get("city"),
                    "state": lead_row.get("state"),
                    "zip_code": lead_row.get("zip_code"),
                    "phone": lead_row.get("phone"),
                }

        rendered_at = share.get("rendered_at")
        fallback_share_url = share.get("share_url")
        if not fallback_share_url:
            fallback_share_url = f"/r/{share_token}"

        return {
            "id": share["id"],
            "type": share["type"],
            "config": share["config"],
            "content": share["content"],
            "business_profile": share["business_profile"],
            "status": share["status"],
            "created_at": share["created_at"],
            "updated_at": share["updated_at"],
            "thumbnail_url": share.get("thumbnail_url"),
            "pdf_url": share.get("pdf_url"),
            "preview_url": share.get("preview_url"),
            "rendered_at": rendered_at.isoformat() if rendered_at else None,
            "render_checksum": share.get("render_checksum"),
            "render_html_path": share.get("render_html_path"),
            "share_url": fallback_share_url,
            "lead": lead_summary,
        }
    finally:
        await db.close()


@router.post("/{report_id}/send")
async def send_report(report_id: str, send_request: ReportSend, background_tasks: BackgroundTasks):
    """Send report to lead via specified method."""
    db = await get_db()
    try:
        await _ensure_optional_columns(db)
        # Get report and lead data
        report = await db.fetch_one(
            sa.text("SELECT * FROM reports WHERE id = :report_id"),
            {"report_id": report_id}
        )
        
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        lead = await db.fetch_one(
            sa.text("SELECT * FROM leads WHERE id = :lead_id"),
            {"lead_id": send_request.lead_id}
        )
        
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        share = await _ensure_share_link(db, report_id, report.get("share_token"), report.get("share_url"))
        share_url = share["url"]

        report_payload = dict(report)
        lead_payload = dict(lead)

        background_tasks.add_task(
            _send_report_background,
            report_payload,
            lead_payload,
            send_request.method,
            share_url,
            send_request.message,
        )
        
        # Update report status
        await db.execute(
            sa.text("""
                UPDATE reports 
                SET status = 'sent', sent_at = :sent_at, updated_at = :updated_at
                WHERE id = :report_id
            """),
            {
                "report_id": report_id,
                "sent_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        )
        
        await db.commit()
        
        return {
            "status": "sent",
            "message": "Report sent successfully",
            "share_url": share_url,
            "method": send_request.method
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to send report: {str(e)}")
    finally:
        await db.close()


@router.get("/lead/{lead_id}")
async def get_reports_for_lead(lead_id: str):
    """Get all reports for a specific lead."""
    db = await get_db()
    try:
        reports = await db.fetch_all(
            sa.text("""
                SELECT id, type, status, created_at, updated_at 
                FROM reports 
                WHERE lead_id = :lead_id 
                ORDER BY created_at DESC
            """),
            {"lead_id": lead_id}
        )
        
        return [
            {
                "id": report["id"],
                "type": report["type"],
                "status": report["status"],
                "created_at": report["created_at"],
                "updated_at": report["updated_at"],
                "view_url": f"/dashboard/reports/{report['id']}"
            }
            for report in reports
        ]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get reports: {str(e)}")
    finally:
        await db.close()


async def _generate_pdf_background(
    report_id: str,
    config: Optional[Dict[str, Any]] = None,
    content: Optional[Dict[str, Any]] = None,
    business_profile: Optional[Dict[str, Any]] = None,
    lead: Optional[Dict[str, Any]] = None,
) -> None:
    """Background task to generate PDF."""

    try:
        lead_payload = lead
        if lead_payload is None:
            db = await get_db()
            try:
                lead_row = await db.fetch_one(
                    sa.text(
                        """
                        SELECT leads.* FROM leads
                        INNER JOIN reports ON reports.lead_id = leads.id
                        WHERE reports.id = :report_id
                        """
                    ),
                    {"report_id": report_id},
                )
                lead_payload = dict(lead_row) if lead_row else None
            finally:
                await db.close()

        resolved_content, html = renderer.render(
            config=config or {},
            content=content or {},
            business_profile=business_profile or {},
            lead=lead_payload,
        )

        reports_dir = ensure_reports_directory()
        pdf_path = reports_dir / f"{report_id}.pdf"
        HTML(string=html, base_url=str(Path.cwd())).write_pdf(str(pdf_path))
        pdf_url = f"/uploads/reports/{pdf_path.name}"

        update_db = await get_db()
        try:
            await update_db.execute(
                sa.text(
                    """
                    UPDATE reports
                    SET pdf_url = :pdf_url,
                        content = :content,
                        updated_at = :updated_at
                    WHERE id = :report_id
                    """
                ),
                {
                    "pdf_url": pdf_url,
                    "content": resolved_content,
                    "updated_at": datetime.utcnow(),
                    "report_id": report_id,
                },
            )
            await update_db.commit()
        finally:
            await update_db.close()

    except Exception as exc:  # noqa: BLE001
        print(f"PDF generation failed for report {report_id}: {exc}")


async def _send_report_background(
    report: Dict[str, Any],
    lead: Dict[str, Any],
    method: str,
    share_url: str,
    message: Optional[str] = None,
) -> None:
    """Background task to deliver the report via email or SMS."""

    try:
        report_id = report.get("id")
        company = (report.get("business_profile") or {}).get("company", {})
        company_name = company.get("name", "Your Roofing Partner")

        if not report.get("pdf_url"):
            await _generate_pdf_background(
                report_id,
                report.get("config") or {},
                report.get("content") or {},
                report.get("business_profile") or {},
                lead,
            )

        pdf_url = report.get("pdf_url") or f"/uploads/reports/{report_id}.pdf"
        base_url = str(settings.base_url) if settings.base_url else None
        full_share_url = f"{base_url}{share_url}" if base_url else share_url
        full_pdf_url = f"{base_url}{pdf_url}" if base_url else pdf_url

        adapters = get_delivery_adapters()
        lead_name = lead.get("homeowner_name") or lead.get("name") or "there"

        if method == "email" and lead.get("email"):
            subject = f"{company_name} • Your Roofing Report"
            body = message or (
                f"Hi {lead_name},\n\n"
                f"Your personalized roofing report is ready. Review it here: {full_share_url}\n"
                f"Download the PDF: {full_pdf_url}\n\n"
                f"-- {company_name}"
            )
            await adapters.email.send_email(
                lead["email"],
                subject,
                body,
                {"report_id": report_id, "share_url": full_share_url},
            )
        elif method == "sms" and lead.get("phone"):
            body = message or (
                f"{company_name}: your roofing report is ready. View it at {full_share_url}"
            )
            await adapters.sms.send_sms(
                lead["phone"],
                body,
                {"report_id": report_id, "share_url": full_share_url},
            )

        db = await get_db()
        try:
            await db.execute(
                sa.text(
                    """
                    INSERT INTO activity_feed (
                        type, title, message, lead_id, metadata, timestamp
                    ) VALUES (
                        'report_sent', 'Report Sent', :message, :lead_id, :metadata, :timestamp
                    )
                    """
                ),
                {
                    "message": f"Report sent via {method} to {lead_name}",
                    "lead_id": lead.get("id"),
                    "metadata": {
                        "report_id": report_id,
                        "method": method,
                        "share_url": share_url,
                        "pdf_url": pdf_url,
                    },
                    "timestamp": datetime.utcnow(),
                },
            )
            await db.commit()
        finally:
            await db.close()

    except Exception as exc:  # noqa: BLE001
        print(f"Report send failed for report {report.get('id')}: {exc}")
