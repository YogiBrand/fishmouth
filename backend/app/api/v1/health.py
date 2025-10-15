"""Health and readiness endpoints exposed via FastAPI router."""

from __future__ import annotations

from datetime import datetime

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter(include_in_schema=False)

logger = structlog.get_logger("health")


@router.get("/healthz")
async def healthz() -> dict:
    return {
        "status": "ok",
        "service": "backend",
        "timestamp": datetime.utcnow().isoformat(),
    }


@router.get("/readyz")
async def readyz(db: Session = Depends(get_db)) -> dict:
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "service": "backend",
            "timestamp": datetime.utcnow().isoformat(),
        }
    except Exception as exc:  # pragma: no cover - defensive
        logger.error("readyz.failed", error=str(exc))
        raise HTTPException(status_code=503, detail="service unavailable") from exc


@router.get("/health")
async def legacy_health(db: Session = Depends(get_db)) -> dict:
    return await readyz(db)


__all__ = ["router"]
