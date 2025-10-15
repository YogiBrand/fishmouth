from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel
from typing import Optional
from boost.backend.services.rendering.renderer import render_report_html_to_pdf_and_png
from boost.backend.lib.events import emit_event

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

class RenderRequest(BaseModel):
    html: str
    force: Optional[bool] = False

class RenderResponse(BaseModel):
    pdf_url: str
    preview_url: str
    checksum: str

@router.post("/{report_id}/render", response_model=RenderResponse)
def render_report(report_id: str, req: RenderRequest):
    if not req.html:
        raise HTTPException(status_code=400, detail="html is required")
    pdf_path, png_path, checksum = render_report_html_to_pdf_and_png(report_id, req.html)
    emit_event("report.rendered", {"report_id": report_id, "checksum": checksum})
    # In production, you'd return CDN/HTTP URLs; for dev we return file paths.
    return RenderResponse(pdf_url=pdf_path, preview_url=png_path, checksum=checksum)
