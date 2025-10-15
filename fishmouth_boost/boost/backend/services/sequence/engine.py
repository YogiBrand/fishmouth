# boost/backend/services/sequence/engine.py
from typing import Dict, Any
import time
class SequenceEngine:
    def __init__(self, outbox_sender): self.send = outbox_sender
    def run_step(self, enrollment: Dict[str, Any], step: Dict[str, Any]) -> Dict[str, Any]:
        t = step.get("type")
        if t == "wait.for":
            time.sleep(0.01); return {"status":"scheduled","resume_in": step.get("duration_sec",60)}
        if t == "email.send": return self.send(channel="email", payload=step.get("payload",{}))
        if t == "sms.send": return self.send(channel="sms", payload=step.get("payload",{}))
        if t == "condition.if":
            expr = step.get("expr", True); return {"status":"routed","branch": "then" if expr else "else"}
        return {"status":"noop"}
