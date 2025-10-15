"""Sequence enrollment management endpoints."""

from __future__ import annotations

from typing import Any, Dict, List, Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.database import get_db
from models import Sequence, SequenceEnrollment, SequenceHistory
from services.sequence_service import SequenceService
from services.sequence import ENGINE as dev_sequence_engine

sequences_router = APIRouter(prefix="/api/v1/sequences", tags=["sequences"])
enrollments_router = APIRouter(prefix="/api/v1/enrollments", tags=["sequences"])


class DevSequencePayload(BaseModel):
    name: str
    workflow_definition: Dict[str, Any]
    active: bool = True


@sequences_router.put("/{sequence_key}")
async def upsert_sequence(sequence_key: str, definition: DevSequencePayload) -> Dict[str, Any]:
    """Persist a developer sequence definition for manual stepping flows."""

    record = dev_sequence_engine.save_sequence(
        sequence_key,
        definition.workflow_definition,
        metadata={"name": definition.name, "active": definition.active},
    )
    return {"id": sequence_key, "name": definition.name, "active": definition.active, "workflow_definition": record["definition"]}


class EnrollmentRequest(BaseModel):
    lead_id: Union[int, str]


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
async def enroll_sequence(sequence_id: str, body: EnrollmentRequest) -> Dict[str, Any]:
    if not sequence_id.isdigit():
        sequence = dev_sequence_engine.get_sequence(sequence_id)
        if not sequence:
            raise HTTPException(status_code=404, detail="Sequence not found")
        lead_identifier = str(body.lead_id)
        state = dev_sequence_engine.enroll(sequence_id, lead_identifier, context={"lead_id": lead_identifier})
        enrollment_id = f"{sequence_id}:{lead_identifier}"
        return {
            "id": enrollment_id,
            "sequence_id": sequence_id,
            "lead_id": lead_identifier,
            "status": state.status,
            "current_step": state.step_index,
        }

    sequence_pk = int(sequence_id)
    db = await get_db()
    try:
        sequence = (
            db.session.query(Sequence)
            .filter(Sequence.id == sequence_pk)
            .first()
        )
        if not sequence:
            raise HTTPException(status_code=404, detail="Sequence not found")

        try:
            lead_pk = int(body.lead_id)
        except (TypeError, ValueError) as exc:
            await db.rollback()
            raise HTTPException(status_code=400, detail="lead_id must be an integer") from exc

        try:
            enrollment = SequenceService.enroll_lead_in_sequence(
                lead_pk,
                sequence_pk,
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
async def enrollment_detail(enrollment_id: str) -> Dict[str, Any]:
    if not enrollment_id.isdigit():
        state = dev_sequence_engine.state(enrollment_id)
        if not state:
            raise HTTPException(status_code=404, detail="Enrollment not found")
        return {
            "id": enrollment_id,
            "sequence_id": state.sequence_id,
            "lead_id": state.lead_id,
            "status": state.status,
            "step_index": state.step_index,
            "history": state.history,
        }

    enrollment_pk = int(enrollment_id)
    db = await get_db()
    try:
        enrollment = (
            db.session.query(SequenceEnrollment)
            .filter(SequenceEnrollment.id == enrollment_pk)
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


@enrollments_router.post("/{enrollment_id}/step")
async def enrollment_step(enrollment_id: str) -> Dict[str, Any]:
    state = dev_sequence_engine.state(enrollment_id)
    if not state:
        raise HTTPException(status_code=404, detail="Enrollment not found for manual stepping")
    result = dev_sequence_engine.step(enrollment_id)
    return result
