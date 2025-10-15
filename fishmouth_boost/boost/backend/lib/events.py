from __future__ import annotations
import os, sys, json, time
from typing import Any, Dict, Optional
from datetime import datetime
from uuid import uuid4

REQUEST_ID_HEADER = "X-Request-ID"

def _now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"

def emit_event(event_type: str,
               payload: Dict[str, Any],
               *,
               source_service: str = "backend",
               request_id: Optional[str] = None,
               writer: Optional[callable] = None) -> Dict[str, Any]:
    """Emit a business event.

    - If `writer` is provided, it will be called with the event dict (use this to insert into DB).
    - Otherwise, the event is printed to stdout as JSON (safe default).
    - Returns the event dict for inspection/testing.

    Payload should include relevant IDs: lead_id, report_id, message_id, etc.
    """
    evt = {
        "id": str(uuid4()),
        "type": event_type,
        "source_service": source_service,
        "payload": payload or {},
        "request_id": request_id or payload.get("request_id") or str(uuid4()),
        "created_at": _now_iso(),
    }
    if writer:
        try:
            writer(evt)
        except Exception as e:
            # fall back to log if DB write fails
            print(json.dumps({"level": "error", "msg": "event_write_failed", "error": str(e), "event": evt}), file=sys.stderr)
            print(json.dumps({"level": "info", "event": evt}))
    else:
        print(json.dumps({"level": "info", "event": evt}))
    return evt
