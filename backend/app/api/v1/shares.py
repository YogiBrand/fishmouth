from __future__ import annotations

import json
import logging
import secrets
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import sqlalchemy as sa
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel

from app.core.config import get_settings
from app.core.database import get_db
from app.lib import EventPayload, emit_event
from services.outbox_service import register_click_event

router = APIRouter(prefix="/api/v1/shares", tags=["shares"])
public_router = APIRouter(include_in_schema=False)


STATIC_ROOT = Path(__file__).resolve().parents[2] / "static"
logger = logging.getLogger(__name__)
settings = get_settings()


class ShareCreate(BaseModel):
    report_id: str
    expires_at: Optional[datetime] = None


class ShareResponse(BaseModel):
    id: str
    token: str
    url: str
    expires_at: Optional[datetime]


def _viewer_request_id(request: Request) -> str:
    request_id = getattr(request.state, "request_id", None) or request.headers.get("X-Request-ID")
    return request_id or str(uuid.uuid4())


def _resolve_html_content(path_value: Optional[str]) -> Optional[str]:
    if not path_value:
        return None

    candidate = Path(path_value)
    if candidate.is_file():
        return candidate.read_text(encoding="utf-8")

    if path_value.startswith("/static/"):
        relative = path_value[len("/static/"):]
        file_path = STATIC_ROOT / relative
        if file_path.is_file():
            return file_path.read_text(encoding="utf-8")

    return None


async def _emit_share_event(
    db,
    event_type: str,
    request: Request,
    report_id: str,
    token: str,
    payload: Dict[str, Any],
    *,
    lead_id: Optional[str] = None,
    source: str = "api.share",
) -> None:
    request_id = _viewer_request_id(request)
    event_payload = EventPayload(
        type=event_type,
        source_service=source,
        report_id=report_id,
        lead_id=lead_id,
        payload={"token": token, **payload},
        request_id=request_id,
    )
    emit_event(db.session, event_payload)


@router.post("", response_model=ShareResponse, status_code=201)
async def create_share(body: ShareCreate, request: Request) -> ShareResponse:
    db = await get_db()
    try:
        report = await db.fetch_one(
            sa.text(
                "SELECT id, lead_id FROM reports WHERE id = :report_id"
            ),
            {"report_id": body.report_id},
        )
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")

        token = secrets.token_hex(16)
        share_id = str(uuid.uuid4())
        created_at = datetime.utcnow()

        await db.execute(
            sa.text(
                """
                INSERT INTO public_shares (id, report_id, token, expires_at, revoked, created_at)
                VALUES (:id, :report_id, :token, :expires_at, 0, :created_at)
                """
            ),
            {
                "id": share_id,
                "report_id": body.report_id,
                "token": token,
                "expires_at": body.expires_at,
                "created_at": created_at,
            },
        )

        share_url = f"/r/{token}"
        await db.execute(
            sa.text(
                """
                UPDATE reports
                SET share_token = :token,
                    share_url = :share_url,
                    updated_at = :updated_at
                WHERE id = :report_id
                """
            ),
            {
                "token": token,
                "share_url": share_url,
                "updated_at": created_at,
                "report_id": body.report_id,
            },
        )

        await _emit_share_event(
            db,
            "share.created",
            request,
            body.report_id,
            token,
            {},
            lead_id=str(report.get("lead_id")) if report.get("lead_id") is not None else None,
        )
        await db.commit()

        return ShareResponse(id=share_id, token=token, url=share_url, expires_at=body.expires_at)
    except Exception:
        await db.rollback()
        raise
    finally:
        await db.close()


@router.delete("/{token}")
async def revoke_share(token: str, request: Request) -> Dict[str, Any]:
    db = await get_db()
    try:
        share = await db.fetch_one(
            sa.text(
                """
                SELECT id, report_id, revoked, r.lead_id
                FROM public_shares
                JOIN reports r ON r.id = public_shares.report_id
                WHERE public_shares.token = :token
                """
            ),
            {"token": token},
        )
        if not share:
            raise HTTPException(status_code=404, detail="Share token not found")
        if share.get("revoked"):
            return {"ok": True, "revoked": True}

        await db.execute(
            sa.text(
                """
                UPDATE public_shares
                SET revoked = 1
                WHERE token = :token
                """
            ),
            {"token": token},
        )

        await db.execute(
            sa.text(
                """
                UPDATE reports
                SET share_token = NULL,
                    share_url = NULL,
                    updated_at = :updated_at
                WHERE id = :report_id AND share_token = :token
                """
            ),
            {
                "updated_at": datetime.utcnow(),
                "report_id": share["report_id"],
                "token": token,
            },
        )

        await _emit_share_event(
            db,
            "share.revoked",
            request,
            share["report_id"],
            token,
            {},
            lead_id=str(share.get("lead_id")) if share.get("lead_id") is not None else None,
        )
        await db.commit()
        return {"ok": True, "revoked": True}
    except Exception:
        await db.rollback()
        raise
    finally:
        await db.close()


def _has_expired(expires_at: Optional[datetime]) -> bool:
    if not expires_at:
        return False
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < datetime.now(timezone.utc)


def _absolute_shortlink_target(target: str) -> str:
    if target.startswith("http://") or target.startswith("https://"):
        return target
    base = str(settings.base_url) if settings.base_url else ""
    if base:
        return f"{base.rstrip('/')}{target}"
    return target


@public_router.get("/l/{code}")
async def shortlink_redirect(code: str, request: Request) -> RedirectResponse:
    db = await get_db()
    try:
        dialect = db.session.bind.dialect.name if hasattr(db, "session") else "sqlite"
        pattern = f'%"code":"{code}"%'
        if dialect == "postgresql":
            query = sa.text(
                "SELECT id, payload FROM outbox_messages "
                "WHERE payload::text LIKE :pattern ORDER BY created_at DESC LIMIT 5"
            )
        else:
            query = sa.text(
                "SELECT id, payload FROM outbox_messages "
                "WHERE payload LIKE :pattern ORDER BY created_at DESC LIMIT 5"
            )
        rows = await db.fetch_all(query, {"pattern": pattern})
    finally:
        await db.close()

    message_id: Optional[str] = None
    shortlink_meta: Optional[Dict[str, Any]] = None
    target_value: Optional[str] = None

    for row in rows:
        payload = row["payload"] if isinstance(row, dict) else row[1]
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                continue
        if not isinstance(payload, dict):
            continue
        context_url = None
        context = payload.get("context")
        if isinstance(context, dict):
            context_url = context.get("share_url")
        for entry in payload.get("shortlinks", []):
            if entry.get("code") == code:
                message_id = row["id"] if isinstance(row, dict) else row[0]
                shortlink_meta = entry
                target_value = entry.get("target") or entry.get("url") or context_url
                break
        if message_id:
            break

    if not target_value and shortlink_meta is None and rows:
        # Attempt fallback to last inspected payload context
        try:
            payload = rows[0]["payload"] if isinstance(rows[0], dict) else rows[0][1]
            if isinstance(payload, str):
                payload = json.loads(payload)
            if isinstance(payload, dict):
                context = payload.get("context")
                if isinstance(context, dict):
                    target_value = context.get("share_url")
        except Exception:  # noqa: BLE001 - fallback best effort
            target_value = None

    if not message_id or not target_value:
        raise HTTPException(status_code=404, detail="Shortlink not found")

    register_click_event(message_id, shortlink_meta or {"code": code, "target": target_value})

    redirect_url = _absolute_shortlink_target(target_value)
    logger.info(
        "shortlink.redirect",
        extra={"code": code, "message_id": message_id, "target": redirect_url},
    )
    return RedirectResponse(url=redirect_url, status_code=302)


@public_router.get("/r/{token}")
async def public_view(token: str, request: Request) -> HTMLResponse:
    db = await get_db()
    try:
        share = await db.fetch_one(
            sa.text(
                """
                SELECT ps.id, ps.report_id, ps.revoked, ps.expires_at,
                       r.render_html_path, r.pdf_url, r.preview_url, r.lead_id
                FROM public_shares ps
                JOIN reports r ON r.id = ps.report_id
                WHERE ps.token = :token
                ORDER BY ps.created_at DESC
                LIMIT 1
                """
            ),
            {"token": token},
        )

        legacy_report = None
        if not share:
            legacy_report = await db.fetch_one(
                sa.text(
                    """
                    SELECT id AS report_id, share_url, share_token, render_html_path,
                           pdf_url, preview_url, lead_id
                    FROM reports
                    WHERE share_token = :token
                    """
                ),
                {"token": token},
            )
            if legacy_report:
                share = {
                    "id": legacy_report["report_id"],
                    "report_id": legacy_report["report_id"],
                    "revoked": False,
                    "expires_at": None,
                    "render_html_path": legacy_report.get("render_html_path"),
                    "pdf_url": legacy_report.get("pdf_url"),
                    "preview_url": legacy_report.get("preview_url"),
                    "lead_id": legacy_report.get("lead_id"),
                }

        if not share:
            raise HTTPException(status_code=404, detail="Share not found")

        if share.get("revoked"):
            raise HTTPException(status_code=410, detail="Share revoked")
        if _has_expired(share.get("expires_at")):
            raise HTTPException(status_code=410, detail="Share expired")

        html_content = _resolve_html_content(share.get("render_html_path"))
        pdf_url = share.get("pdf_url")
        preview_url = share.get("preview_url")

        if not html_content:
            html_content = f"""
            <!DOCTYPE html>
            <html lang='en'>
              <head>
                <meta charset='utf-8' />
                <title>Report Viewer</title>
                <meta name='viewport' content='width=device-width, initial-scale=1'>
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tailwindcss@3.4.14/dist/tailwind.min.css" />
              </head>
              <body class='bg-slate-100 min-h-screen flex flex-col items-center justify-center p-6'>
                <div class='bg-white shadow-xl max-w-3xl w-full rounded-2xl p-10 text-center space-y-6'>
                  <h1 class='text-3xl font-bold text-slate-800'>Report Ready</h1>
                  <p class='text-slate-600'>Download the latest PDF using the link below.</p>
                  <a class='inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-blue-700 transition' href='{pdf_url}' target='_blank' rel='noopener'>
                    Download PDF
                  </a>
                  {f"<img class='mx-auto rounded-lg shadow-md max-h-96' src='{preview_url}' alt='Report preview' />" if preview_url else ''}
                </div>
              </body>
            </html>
            """

        await _emit_share_event(
            db,
            "report.viewed",
            request,
            share["report_id"],
            token,
            {"pdf_url": pdf_url, "preview_url": preview_url},
            lead_id=str(share.get("lead_id")) if share.get("lead_id") is not None else None,
            source="public.viewer",
        )
        await db.commit()

        return HTMLResponse(content=html_content)
    except HTTPException:
        await db.rollback()
        raise
    except Exception:
        await db.rollback()
        raise
    finally:
        await db.close()


__all__ = ["router", "public_router"]
