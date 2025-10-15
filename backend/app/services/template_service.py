"""Service helpers for managing reusable templates and previews."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from app.lib.token_resolver import (
    ALLOWED_SCOPES,
    Resolution,
    build_preview_context,
    resolve_text,
)


async def list_templates(db) -> List[Dict[str, Any]]:
    records = await db.fetch_all(
        "SELECT id, scope, content, version, is_system, updated_at FROM templates ORDER BY scope, id"
    )
    return [dict(row) for row in records]


async def get_template(db, template_id: str) -> Optional[Dict[str, Any]]:
    record = await db.fetch_one(
        "SELECT id, scope, content, version, is_system, updated_at FROM templates WHERE id = :id",
        {"id": template_id},
    )
    return dict(record) if record else None


async def save_template(
    db,
    *,
    template_id: str,
    scope: str,
    content: str,
    is_system: bool = False,
) -> Dict[str, Any]:
    if scope not in ALLOWED_SCOPES:
        raise ValueError(f"Unsupported scope '{scope}'. Expected one of: {', '.join(sorted(ALLOWED_SCOPES))}.")

    existing = await db.fetch_one(
        "SELECT version FROM templates WHERE id = :id",
        {"id": template_id},
    )
    now = datetime.utcnow()

    if existing:
        next_version = int(existing.get("version") or 0) + 1
        record = await db.fetch_one(
            """
            UPDATE templates
            SET scope = :scope,
                content = :content,
                version = :version,
                is_system = :is_system,
                updated_at = :updated_at
            WHERE id = :id
            RETURNING id, scope, content, version, is_system, updated_at
            """,
            {
                "id": template_id,
                "scope": scope,
                "content": content,
                "version": next_version,
                "is_system": is_system,
                "updated_at": now,
            },
        )
    else:
        record = await db.fetch_one(
            """
            INSERT INTO templates (id, scope, content, version, is_system, updated_at)
            VALUES (:id, :scope, :content, 1, :is_system, :updated_at)
            RETURNING id, scope, content, version, is_system, updated_at
            """,
            {
                "id": template_id,
                "scope": scope,
                "content": content,
                "is_system": is_system,
                "updated_at": now,
            },
        )

    if not record:
        raise RuntimeError("Failed to persist template")

    return dict(record)


async def preview_template(
    db,
    *,
    template_id: str,
    lead_id: Optional[str] = None,
    report_id: Optional[str] = None,
) -> Dict[str, Any]:
    template = await get_template(db, template_id)
    if not template:
        raise ValueError("Template not found")

    context = await build_preview_context(db, lead_id=lead_id, report_id=report_id)
    resolution: Resolution = resolve_text(template["content"], context)
    return {
        "id": template["id"],
        "scope": template["scope"],
        "resolved": resolution.text,
        "unresolved_tokens": resolution.unresolved_tokens,
    }
