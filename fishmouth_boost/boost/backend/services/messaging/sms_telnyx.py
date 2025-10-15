import os
from typing import Dict, Any

TELNYX_ENABLED = os.environ.get("TELNYX_ENABLED", "false").lower() == "true"
TELNYX_API_KEY = os.environ.get("TELNYX_API_KEY")

def send_sms_telnyx(to_phone: str, message: str) -> Dict[str, Any]:
    """Send an SMS via Telnyx.
    - Dry-run if TELNYX_ENABLED is false or API key missing.
    - Returns a dict with a `provider_id` (mocked in dry-run).
    """
    if not TELNYX_ENABLED or not TELNYX_API_KEY:
        return {"status": "dry_run", "provider": "telnyx", "provider_id": "dryrun-" + to_phone}

    try:
        import requests
        data = {"to": to_phone, "text": message, "from": os.environ.get("TELNYX_FROM_NUMBER", "+10000000000")}
        resp = requests.post(
            "https://api.telnyx.com/v2/messages",
            headers={"Authorization": f"Bearer {TELNYX_API_KEY}"},
            json=data,
            timeout=10,
        )
        if resp.status_code in (200, 202):
            j = resp.json()
            return {"status": "sent", "provider": "telnyx", "provider_id": j.get("data", {}).get("id", "unknown")}
        return {"status": "error", "provider": "telnyx", "error": resp.text}
    except Exception as e:
        return {"status": "error", "provider": "telnyx", "error": str(e)}
