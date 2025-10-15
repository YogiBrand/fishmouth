from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
from boost.backend.services.sequence.engine import SequenceEngine

router = APIRouter(prefix="/api/v1", tags=["sequences"])

ENGINE = SequenceEngine()
SEQUENCES: Dict[str, Dict[str, Any]] = {}
ENROLLMENTS: Dict[str, Dict[str, Any]] = {}

class SaveSequence(BaseModel):
    name: str
    workflow_definition: Dict[str, Any]
    active: bool = True

@router.put("/sequences/{sequence_id}")
def upsert_sequence(sequence_id: str, body: SaveSequence):
    SEQUENCES[sequence_id] = body.dict()
    return {"id": sequence_id, **SEQUENCES[sequence_id]}

class EnrollRequest(BaseModel):
    lead_id: str

@router.post("/sequences/{sequence_id}/enroll")
def enroll(sequence_id: str, body: EnrollRequest):
    seq = SEQUENCES.get(sequence_id)
    if not seq:
        raise HTTPException(status_code=404, detail="sequence not found")
    enrollment_id = f"{sequence_id}:{body.lead_id}"
    ENROLLMENTS[enrollment_id] = {"sequence_id": sequence_id, "lead_id": body.lead_id, "status": "active"}
    ENGINE.enroll(enrollment_id, seq["workflow_definition"], {"lead_id": body.lead_id})
    return {"id": enrollment_id, **ENROLLMENTS[enrollment_id]}

@router.post("/enrollments/{enrollment_id}/step")
def step(enrollment_id: str):
    res = ENGINE.step(enrollment_id)
    return res
