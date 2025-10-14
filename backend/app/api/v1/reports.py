"""Public report endpoints for shareable property reports."""

from __future__ import annotations

import json
import uuid
from datetime import date, datetime
from pathlib import Path
from decimal import Decimal
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import HTMLResponse
import sqlalchemy as sa

from app.core.database import get_db
from app.services.email_service import EmailService
from app.services.report_generator import ReportGeneratorService
from app.services.activity_stream import activity_notifier


router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _serialize(record: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not record:
        return {}

    def convert(value: Any) -> Any:
        if isinstance(value, Decimal):
            return float(value)
        if isinstance(value, uuid.UUID):
            return str(value)
        if isinstance(value, (datetime, date)):
            return value.isoformat()
        return value

    return {k: convert(v) for k, v in record.items()}


def _merge_payload(report: Dict[str, Any], property_data: Dict[str, Any], score_data: Dict[str, Any], contractor: Dict[str, Any]) -> Dict[str, Any]:
    payload: Dict[str, Any] = {}
    payload.update(property_data)
    payload.update(score_data)
    payload.update(contractor)
    payload.update(report)

    # Include generated narrative for the frontend audience
    if report.get("report_payload"):
        payload.update(report.get("report_payload") or {})
    return payload


def _pdf_size_kb(path_str: str) -> int:
    try:
        if path_str.startswith("/uploads/"):
            local_path = Path("uploads") / path_str.split("/uploads/")[1]
        else:
            local_path = Path(path_str)
        return int(local_path.stat().st_size / 1024)
    except Exception:  # noqa: BLE001
        return 0


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/generate")
async def create_shareable_report(property_id: str, contractor_id: str, background_tasks: BackgroundTasks):
    db = await get_db()
    try:
        property_row = await db.fetch_one(sa.text("SELECT * FROM properties WHERE id = :id"), {"id": property_id})
        if not property_row:
            raise HTTPException(status_code=404, detail="Property not found")

        score_row = await db.fetch_one(sa.text("SELECT * FROM property_scores WHERE property_id = :id"), {"id": property_id})
        contractor_row = await db.fetch_one(sa.text("SELECT * FROM contractors WHERE id = :id"), {"id": contractor_id})
        if not contractor_row:
            raise HTTPException(status_code=404, detail="Contractor not found")

        property_dict = dict(property_row)
        score_dict = dict(score_row) if score_row else {}
        contractor_dict = dict(contractor_row)

        report_id = str(uuid.uuid4())

        await db.execute(
            sa.text(
                """
                INSERT INTO property_reports (id, property_id, contractor_id, report_type, report_title)
                VALUES (:id, :property_id, :contractor_id, :report_type, :report_title)
                """
            ),
            {
                "id": report_id,
                "property_id": property_id,
                "contractor_id": contractor_id,
                "report_type": "full_analysis",
                "report_title": f"Roof Assessment - {property_dict.get('address', 'Property')}",
            },
        )
        await db.commit()

        background_tasks.add_task(
            ReportGeneratorService().generate_report_content,
            property_data=property_dict,
            property_score=score_dict,
            contractor_data=contractor_dict,
            report_id=report_id,
        )

        activity_notifier.publish(
            "report_requested",
            {
                "report_id": report_id,
                "property_id": property_id,
                "contractor_id": contractor_id,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

        return {"report_id": report_id, "report_url": f"/report/{report_id}", "status": "generating"}
    finally:
        await db.close()


@router.get("/report/{report_id}", response_class=HTMLResponse)
async def get_report_page(report_id: str):
    db = await get_db()
    try:
        report_row = await db.fetch_one(sa.text("SELECT * FROM property_reports WHERE id = :id"), {"id": report_id})
        if not report_row:
            raise HTTPException(status_code=404, detail="Report not found")

        property_row = await db.fetch_one(sa.text("SELECT * FROM properties WHERE id = :id"), {"id": report_row["property_id"]})
        score_row = await db.fetch_one(sa.text("SELECT * FROM property_scores WHERE property_id = :id"), {"id": report_row["property_id"]})
        contractor_row = await db.fetch_one(sa.text("SELECT * FROM contractors WHERE id = :id"), {"id": report_row["contractor_id"]})

        await db.execute(
            sa.text("UPDATE property_reports SET opened_at = COALESCE(opened_at, NOW()), view_count = view_count + 1 WHERE id = :id"),
            {"id": report_id},
        )
        await db.commit()

        payload = _merge_payload(_serialize(report_row), _serialize(property_row), _serialize(score_row), _serialize(contractor_row))
        html = f"""
        <!DOCTYPE html>
        <html lang=\"en\">
            <head>
                <meta charset=\"UTF-8\" />
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
                <title>Property Inspection Report - {payload.get('address', 'Property')}</title>
                <link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css\" />
                <script crossorigin src=\"https://unpkg.com/react@18/umd/react.production.min.js\"></script>
                <script crossorigin src=\"https://unpkg.com/react-dom@18/umd/react-dom.production.min.js\"></script>
                <script src=\"https://unpkg.com/@babel/standalone/babel.min.js\"></script>
            </head>
            <body>
                <div id=\"root\"></div>
                <script>
                    window.REPORT_DATA = {json.dumps(payload)};
                    window.REPORT_ID = "{report_id}";
                </script>
                <script type=\"text/babel\" src=\"/static/report-viewer.jsx\"></script>
            </body>
        </html>
        """
        return HTMLResponse(content=html)
    finally:
        await db.close()


@router.post("/report/{report_id}/download")
async def download_pdf(report_id: str):
    db = await get_db()
    try:
        report_row = await db.fetch_one(sa.text("SELECT * FROM property_reports WHERE id = :id"), {"id": report_id})
        if not report_row:
            raise HTTPException(status_code=404, detail="Report not found")

        property_row = await db.fetch_one(sa.text("SELECT * FROM properties WHERE id = :id"), {"id": report_row["property_id"]})
        score_row = await db.fetch_one(sa.text("SELECT * FROM property_scores WHERE property_id = :id"), {"id": report_row["property_id"]})
        contractor_row = await db.fetch_one(sa.text("SELECT * FROM contractors WHERE id = :id"), {"id": report_row["contractor_id"]})

        pdf_url = report_row.get("pdf_url")
        property_dict = dict(property_row) if property_row else {}
        score_dict = dict(score_row) if score_row else {}
        contractor_dict = dict(contractor_row) if contractor_row else {}

        if not pdf_url:
            generator = ReportGeneratorService()
            pdf_url = await generator.generate_pdf(property_dict, score_dict, contractor_dict)
            await db.execute(
                sa.text("UPDATE property_reports SET pdf_url = :url, pdf_file_size_kb = :size, downloaded_at = NOW() WHERE id = :id"),
                {"url": pdf_url, "size": _pdf_size_kb(pdf_url), "id": report_id},
            )
            await db.commit()
            activity_notifier.publish(
                "report_ready",
                {"report_id": report_id, "pdf_url": pdf_url, "timestamp": datetime.utcnow().isoformat()},
            )
        else:
            await db.execute(sa.text("UPDATE property_reports SET downloaded_at = NOW() WHERE id = :id"), {"id": report_id})
            await db.commit()

        return {"pdf_url": pdf_url}
    finally:
        await db.close()


@router.post("/report/{report_id}/email")
async def email_pdf(report_id: str, payload: Dict[str, str], background_tasks: BackgroundTasks):
    email_address = payload.get("email_address")
    if not email_address:
        raise HTTPException(status_code=400, detail="email_address is required")

    db = await get_db()
    try:
        report_row = await db.fetch_one(sa.text("SELECT * FROM property_reports WHERE id = :id"), {"id": report_id})
        if not report_row:
            raise HTTPException(status_code=404, detail="Report not found")

        property_row = await db.fetch_one(sa.text("SELECT * FROM properties WHERE id = :id"), {"id": report_row["property_id"]})
        score_row = await db.fetch_one(sa.text("SELECT * FROM property_scores WHERE property_id = :id"), {"id": report_row["property_id"]})
        contractor_row = await db.fetch_one(sa.text("SELECT * FROM contractors WHERE id = :id"), {"id": report_row["contractor_id"]})

        property_dict = dict(property_row) if property_row else {}
        score_dict = dict(score_row) if score_row else {}
        contractor_dict = dict(contractor_row) if contractor_row else {}

        generator = ReportGeneratorService()
        pdf_url = report_row.get("pdf_url")
        if not pdf_url:
            pdf_url = await generator.generate_pdf(property_dict, score_dict, contractor_dict)
            await db.execute(sa.text("UPDATE property_reports SET pdf_url = :url WHERE id = :id"), {"url": pdf_url, "id": report_id})
            await db.commit()

        async def send_email_task() -> None:
            service = EmailService()
            await service.send_report_email(
                to_email=email_address,
                pdf_url=pdf_url,
                property_address=property_dict.get("address", ""),
                contractor_name=contractor_dict.get("company_name", ""),
                contractor_phone=contractor_dict.get("phone", ""),
            )

        background_tasks.add_task(send_email_task)
        activity_notifier.publish(
            "report_emailed",
            {
                "report_id": report_id,
                "email": email_address,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )
        return {"status": "sent", "email": email_address}
    finally:
        await db.close()
