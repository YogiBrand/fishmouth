from __future__ import annotations
import time
from typing import Dict, Any, List, Optional

class SequenceEngine:
    """Minimal in-process engine for dev; replace with Celery in production."""
    def __init__(self):
        self.enrollments: Dict[str, Dict[str, Any]] = {}

    def enroll(self, enrollment_id: str, workflow: Dict[str, Any], context: Dict[str, Any]):
        self.enrollments[enrollment_id] = {"workflow": workflow, "context": context, "step": 0, "status": "active"}

    def step(self, enrollment_id: str):
        state = self.enrollments.get(enrollment_id)
        if not state or state["status"] != "active":
            return {"status": "noop"}
        steps: List[Dict[str, Any]] = state["workflow"].get("steps", [])
        i = state["step"]
        if i >= len(steps):
            state["status"] = "completed"
            return {"status": "completed"}
        step = steps[i]
        # For dev: just record the step type and advance
        state["step"] += 1
        return {"status": "advanced", "executed": step.get("type")}
