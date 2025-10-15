"""Lightweight in-process sequence engine for developer workflows."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class DevEnrollmentState:
    sequence_id: str
    lead_id: str
    workflow: Dict[str, Any]
    context: Dict[str, Any]
    step_index: int = 0
    status: str = "active"
    history: List[Dict[str, Any]] = field(default_factory=list)


class SequenceEngine:
    """Minimal engine to allow manual stepping through a workflow definition."""

    def __init__(self) -> None:
        self._sequences: Dict[str, Dict[str, Any]] = {}
        self._enrollments: Dict[str, DevEnrollmentState] = {}

    def save_sequence(self, sequence_id: str, definition: Dict[str, Any], *, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        payload = {
            "id": sequence_id,
            "definition": definition,
            "metadata": metadata or {},
        }
        self._sequences[sequence_id] = payload
        return payload

    def get_sequence(self, sequence_id: str) -> Optional[Dict[str, Any]]:
        return self._sequences.get(sequence_id)

    def enroll(self, sequence_id: str, lead_id: str, *, context: Optional[Dict[str, Any]] = None) -> DevEnrollmentState:
        sequence = self._sequences.get(sequence_id)
        if not sequence:
            raise KeyError(sequence_id)
        enrollment_id = f"{sequence_id}:{lead_id}"
        state = DevEnrollmentState(
            sequence_id=sequence_id,
            lead_id=lead_id,
            workflow=sequence["definition"],
            context=context or {},
        )
        self._enrollments[enrollment_id] = state
        return state

    def state(self, enrollment_id: str) -> Optional[DevEnrollmentState]:
        return self._enrollments.get(enrollment_id)

    def step(self, enrollment_id: str) -> Dict[str, Any]:
        state = self._enrollments.get(enrollment_id)
        if not state:
            return {"status": "not_found"}
        if state.status != "active":
            return {"status": state.status}

        steps: List[Dict[str, Any]] = state.workflow.get("steps", [])
        if state.step_index >= len(steps):
            state.status = "completed"
            state.history.append({"result": "completed"})
            return {"status": "completed"}

        step = steps[state.step_index]
        state.step_index += 1
        executed = {
            "step_index": state.step_index,
            "type": step.get("type", "unknown"),
            "summary": step,
        }
        state.history.append(executed)
        return {"status": "advanced", "executed": executed}

    def list_sequences(self) -> Dict[str, Dict[str, Any]]:
        return self._sequences

    def list_enrollments(self) -> Dict[str, DevEnrollmentState]:
        return self._enrollments


ENGINE = SequenceEngine()
