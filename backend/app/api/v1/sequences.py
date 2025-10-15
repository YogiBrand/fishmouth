"""Sequence enrollment management endpoints."""

from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.database import get_db
from models import Sequence, SequenceEnrollment, SequenceHistory
from services.sequence_service import SequenceService

sequences_router = APIRouter(prefix="/api/v1/sequences", tags=["sequences"])
enrollments_router = APIRouter(prefix="/api/v1/enrollments", tags=["sequences"])


class EnrollmentRequest(BaseModel):
    lead_id: int


def _serialize_enrollment(enrollment: SequenceEnrollment) -> Dict[str, Any]:
    return {
        "id": enrollment.id,
        "sequence_id": enrollment.sequence_id,
        "lead_id": enrollment.lead_id,
        "status": enrollment.status,
        "current_node_id": enrollment.current_node_id,
        "next_execution_at": enrollment.next_execution_at.isoformat() if enrollment.next_execution_at else None,
        "steps_completed": enrollment.steps_completed,
        "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
        "completed_at": enrollment.completed_at.isoformat() if enrollment.completed_at else None,
    }


def _serialize_history(history: List[SequenceHistory]) -> List[Dict[str, Any]]:
    return [
        {
            "id": entry.id,
            "node_id": entry.node_id,
            "step_type": entry.step_type,
            "action": entry.action,
            "status": entry.status,
            "result": entry.result or {},
            "error": entry.error,
            "event_type": entry.event_type,
            "created_at": entry.created_at.isoformat() if entry.created_at else None,
            "occurred_at": entry.occurred_at.isoformat() if entry.occurred_at else None,
        }
        for entry in history
    ]


@sequences_router.post("/{sequence_id}/enroll", status_code=201)
async def enroll_sequence(sequence_id: int, body: EnrollmentRequest) -> Dict[str, Any]:
    db = await get_db()
    try:
        sequence = (
            db.session.query(Sequence)
            .filter(Sequence.id == sequence_id)
            .first()
        )
        if not sequence:
            raise HTTPException(status_code=404, detail="Sequence not found")

        try:
            enrollment = SequenceService.enroll_lead_in_sequence(
                body.lead_id,
                sequence_id,
                sequence.user_id,
                db.session,
            )
        except ValueError as exc:
            await db.rollback()
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        return _serialize_enrollment(enrollment)
    finally:
        await db.close()


@sequences_router.post("/{sequence_id}/pause")
async def pause_sequence(sequence_id: int, body: EnrollmentRequest) -> Dict[str, Any]:
    db = await get_db()
    try:
        enrollment = SequenceService.find_enrollment(sequence_id, body.lead_id, db.session)
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")

        SequenceService.pause_enrollment(enrollment, db.session)
        return _serialize_enrollment(enrollment)
    finally:
        await db.close()


@enrollments_router.get("/{enrollment_id}")
async def enrollment_detail(enrollment_id: int) -> Dict[str, Any]:
    db = await get_db()
    try:
        enrollment = (
            db.session.query(SequenceEnrollment)
            .filter(SequenceEnrollment.id == enrollment_id)
            .first()
        )
        if not enrollment:
            raise HTTPException(status_code=404, detail="Enrollment not found")

        history = (
            db.session.query(SequenceHistory)
            .filter(SequenceHistory.enrollment_id == enrollment_id)
            .order_by(SequenceHistory.created_at.asc())
            .all()
        )

        data = _serialize_enrollment(enrollment)
        data["history"] = _serialize_history(history)
        return data
    finally:
        await db.close()
