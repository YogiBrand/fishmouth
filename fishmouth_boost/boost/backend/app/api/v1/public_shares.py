import os, secrets
from datetime import datetime, timedelta
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from boost.backend.lib.events import emit_event

router = APIRouter(prefix="/api/v1", tags=["shares"])

SHARES: Dict[str, Dict] = {}

class ShareCreate(BaseModel):
    report_id: str
    expires_in: int = 30*24*3600  # 30 days seconds

@router.post("/reports/{report_id}/share")
def create_share(report_id: str, body: ShareCreate):
    token = secrets.token_hex(16)
    SHARES[token] = {
        "report_id": report_id,
        "expires_at": datetime.utcnow() + timedelta(seconds=body.expires_in),
        "revoked": False,
    }
    return {"share_url": f"/r/{token}", "token_id": token, "expires_at": SHARES[token]["expires_at"]}

@router.delete("/shares/{token_id}")
def revoke_share(token_id: str):
    share = SHARES.get(token_id)
    if not share:
        raise HTTPException(status_code=404, detail="not found")
    share["revoked"] = True
    return {"revoked": True}

public_router = APIRouter(include_in_schema=False)

@public_router.get("/r/{token}", response_class=HTMLResponse)
def view_public_report(token: str):
    share = SHARES.get(token)
    if not share:
        raise HTTPException(status_code=404, detail="invalid token")
    if share["revoked"]:
        raise HTTPException(status_code=410, detail="revoked")
    if share["expires_at"] and share["expires_at"] < datetime.utcnow():
        raise HTTPException(status_code=410, detail="expired")
    emit_event("report.viewed", {"report_id": share["report_id"], "token": token})
    # Basic placeholder viewer
    html = f"""<html><body><h1>Report {share['report_id']}</h1><p>Public view token OK.</p></body></html>"""
    return HTMLResponse(content=html, status_code=200)
