# boost/backend/app/api/v1/reports_render.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from ...services.rendering.renderer import render_pdf_and_png, content_checksum
router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

class RenderRequest(BaseModel):
    force: bool = False
    html: Optional[str] = None

@router.post("/{report_id}/render")
async def render(report_id: str, body: RenderRequest):
    html = body.html or "<html><body><h1>Report</h1></body></html>"
    checksum = content_checksum(html)
    out = render_pdf_and_png(html, out_dir=f"/static/uploads/reports/{report_id}", base_name=checksum[:10])
    return {"pdf_url": out["pdf_url"], "preview_url": out["preview_url"], "checksum": checksum}
