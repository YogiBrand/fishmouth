"""Audit logging helpers."""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from models import AuditLog
from sqlalchemy.orm import Session


def record_audit_event(
    db: Session,
    *,
    user_id: Optional[int],
    action: str,
    entity: str,
    entity_id: str,
    metadata: Optional[dict] = None,
) -> None:
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity=entity,
        entity_id=str(entity_id),
        details=metadata,
        created_at=datetime.utcnow(),
    )
    db.add(entry)
