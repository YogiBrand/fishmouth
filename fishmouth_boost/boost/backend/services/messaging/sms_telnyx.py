# boost/backend/services/messaging/sms_telnyx.py
from typing import List, Dict, Any

class TelnyxSmsProvider:
    def __init__(self, api_key: str, from_number: str, dry_run: bool = False):
        self.api_key = api_key; self.from_number = from_number; self.dry_run = dry_run
    def send(self, to: List[str], text: str) -> Dict[str, Any]:
        payload = {"from": self.from_number, "to": to, "text": text}
        if self.dry_run: return {"provider":"telnyx","status":"queued","id":"dryrun","payload":payload}
        # TODO: real API call
        return {"provider":"telnyx","status":"queued","id":"mock456","payload":payload}
