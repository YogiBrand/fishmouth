from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any, Dict, Optional

import sqlalchemy as sa
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.core.database import get_db
from app.lib import EventPayload, emit_event
from app.services.enhanced_report_renderer import EnhancedReportRenderer
from app.services.rendering import content_checksum, render_pdf_and_preview

router = APIRouter(prefix="/api/v1/reports", tags=["reports-render"])

renderer = EnhancedReportRenderer()


class RenderRequest(BaseModel):
    force: bool = False
    html: Optional[str] = None


def _load_lead_payload(row: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    if not row:
        return None
    return dict(row)


def _resolve_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")
    return request_id or str(uuid.uuid4())


@router.post("/{report_id}/render")
async def render_report(report_id: str, body: RenderRequest, request: Request) -> Dict[str, Any]:
    db = await get_db()
    try:
        report = await db.fetch_one(
            sa.text(
                """
                SELECT id, lead_id, config, content, business_profile,
                       render_checksum, pdf_url, preview_url, render_html_path, rendered_at
                FROM reports
                WHERE id = :report_id
                """
            ),
            {"report_id": report_id},
        )

        if not report:
            if not body.html:
                raise HTTPException(status_code=404, detail="Report not found")

            checksum = content_checksum(body.html)
            assets = render_pdf_and_preview(body.html, report_id, checksum[:16])
            rendered_at = datetime.utcnow()

            await db.execute(
                sa.text(
                    """
                    INSERT INTO reports (id, type, status, pdf_url, preview_url, render_checksum, render_html_path, rendered_at, created_at, updated_at)
                    VALUES (:id, :type, :status, :pdf_url, :preview_url, :checksum, :html_url, :rendered_at, :rendered_at, :rendered_at)
                    ON CONFLICT (id) DO UPDATE SET
                        pdf_url = EXCLUDED.pdf_url,
                        preview_url = EXCLUDED.preview_url,
                        render_checksum = EXCLUDED.render_checksum,
                        render_html_path = EXCLUDED.render_html_path,
                        rendered_at = EXCLUDED.rendered_at,
                        updated_at = EXCLUDED.rendered_at
                    """
                ),
                {
                    "id": report_id,
                    "type": "custom",
                    "status": "rendered",
                    "pdf_url": assets["pdf_url"],
                    "preview_url": assets["preview_url"],
                    "checksum": checksum,
                    "html_url": assets["html_url"],
                    "rendered_at": rendered_at,
                },
            )

            event_payload = EventPayload(
                type="report.rendered",
                source_service="api.render",
                report_id=report_id,
                payload={
                    "pdf_url": assets["pdf_url"],
                    "preview_url": assets["preview_url"],
                    "checksum": checksum,
                },
                request_id=_resolve_request_id(request),
            )
            emit_event(db.session, event_payload)
            await db.commit()

            return {
                "pdf_url": assets["pdf_url"],
                "preview_url": assets["preview_url"],
                "checksum": checksum,
                "html_url": assets["html_url"],
                "rendered_at": rendered_at.isoformat(),
                "cached": False,
            }

        lead_payload: Optional[Dict[str, Any]] = None
        lead_id = report.get("lead_id")
        if lead_id:
            lead_row = await db.fetch_one(
                sa.text("SELECT * FROM leads WHERE id = :lead_id"),
                {"lead_id": lead_id},
            )
            lead_payload = _load_lead_payload(lead_row)

        html: str
        if body.html:
            html = body.html
        else:
            _, html = renderer.render(
                config=report.get("config") or {},
                content=report.get("content") or {},
                business_profile=report.get("business_profile") or {},
                lead=lead_payload,
            )

        checksum = content_checksum(html)
        existing_checksum = report.get("render_checksum")
        if (
            not body.force
            and existing_checksum
            and existing_checksum == checksum
            and report.get("pdf_url")
            and report.get("preview_url")
        ):
            rendered_at = report.get("rendered_at")
            return {
                "pdf_url": report["pdf_url"],
                "preview_url": report["preview_url"],
                "checksum": checksum,
                "html_url": report.get("render_html_path"),
                "rendered_at": rendered_at.isoformat() if rendered_at else None,
                "cached": True,
            }

        assets = render_pdf_and_preview(html, report_id, checksum[:16])

        rendered_at = datetime.utcnow()
        await db.execute(
            sa.text(
                """
                UPDATE reports
                SET pdf_url = :pdf_url,
                    preview_url = :preview_url,
                    render_checksum = :checksum,
                    render_html_path = :html_url,
                    rendered_at = :rendered_at,
                    updated_at = :updated_at
                WHERE id = :report_id
                """
            ),
            {
                "pdf_url": assets["pdf_url"],
                "preview_url": assets["preview_url"],
                "checksum": checksum,
                "html_url": assets["html_url"],
                "rendered_at": rendered_at,
                "updated_at": rendered_at,
                "report_id": report_id,
            },
        )

        event_payload = EventPayload(
            type="report.rendered",
            source_service="api.render",
            lead_id=str(lead_id) if lead_id is not None else None,
            report_id=report_id,
            payload={
                "pdf_url": assets["pdf_url"],
                "preview_url": assets["preview_url"],
                "checksum": checksum,
            },
            request_id=_resolve_request_id(request),
        )
        emit_event(db.session, event_payload)
        await db.commit()

        return {
            "pdf_url": assets["pdf_url"],
            "preview_url": assets["preview_url"],
            "checksum": checksum,
            "html_url": assets["html_url"],
            "rendered_at": rendered_at.isoformat(),
            "cached": False,
        }
    except Exception:
        await db.rollback()
        raise
    finally:
        await db.close()
