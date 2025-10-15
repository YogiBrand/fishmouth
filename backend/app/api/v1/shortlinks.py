from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

import sqlalchemy as sa
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.core.database import get_db
from services.outbox_service import register_click_event

router = APIRouter(include_in_schema=False)

logger = logging.getLogger(__name__)
settings = get_settings()


def _absolute_shortlink_target(target: str) -> str:
    if target.startswith("http://") or target.startswith("https://"):
        return target
    base = str(settings.base_url) if settings.base_url else ""
    if base:
        return f"{base.rstrip('/')}{target}"
    return target


@router.get("/l/{code}")
async def shortlink_redirect(code: str, request: Request) -> RedirectResponse:
    db = await get_db()
    try:
        dialect = db.session.bind.dialect.name if hasattr(db, "session") else "sqlite"
        if dialect == "postgresql":
            query = sa.text(
                """
                SELECT m.id, m.payload, sl.element AS shortlink
                FROM outbox_messages m
                CROSS JOIN LATERAL jsonb_array_elements(m.payload->'shortlinks') AS sl(element)
                WHERE sl.element->>'code' = :code
                ORDER BY m.created_at DESC
                LIMIT 5
                """
            )
            rows = await db.fetch_all(query, {"code": code})
        else:
            pattern = f'%"code":"{code}"%'
            query = sa.text(
                "SELECT id, payload, NULL as shortlink FROM outbox_messages "
                "WHERE payload LIKE :pattern ORDER BY created_at DESC LIMIT 5"
            )
            rows = await db.fetch_all(query, {"pattern": pattern})
    finally:
        await db.close()

    message_id: Optional[str] = None
    shortlink_meta: Optional[Dict[str, Any]] = None
    target_value: Optional[str] = None

    for raw_row in rows:
        if isinstance(raw_row, dict):
            row = raw_row
        elif hasattr(raw_row, "_mapping"):
            row = dict(raw_row._mapping)
        else:
            row = {"id": raw_row[0], "payload": raw_row[1], "shortlink": raw_row[2] if len(raw_row) > 2 else None}

        payload = row.get("payload")
        row_shortlink = row.get("shortlink")
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
        if row_shortlink:
            if isinstance(row_shortlink, str):
                try:
                    row_shortlink = json.loads(row_shortlink)
                except json.JSONDecodeError:
                    row_shortlink = None
            if isinstance(row_shortlink, dict):
                message_id = row.get("id")
                shortlink_meta = row_shortlink
                target_value = row_shortlink.get("target") or row_shortlink.get("url") or context_url
                break
        for entry in payload.get("shortlinks", []):
            if entry.get("code") == code:
                message_id = row.get("id")
                shortlink_meta = entry
                target_value = entry.get("target") or entry.get("url") or context_url
                break
        if message_id:
            break

    if not target_value and shortlink_meta is None and rows:
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


__all__ = ["router"]
