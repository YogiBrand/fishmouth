import os, json
from typing import Dict, Any, Optional

SENDGRID_ENABLED = os.environ.get("SENDGRID_ENABLED", "false").lower() == "true"
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")

def send_email_sendgrid(to_email: str, subject: str, html: str, *, attachments: Optional[list] = None) -> Dict[str, Any]:
    """Send an email via SendGrid.
    - Dry-run if SENDGRID_ENABLED is false or API key missing.
    - Returns a dict with a `provider_id` (mocked in dry-run).
    """
    if not SENDGRID_ENABLED or not SENDGRID_API_KEY:
        return {"status": "dry_run", "provider": "sendgrid", "provider_id": "dryrun-" + to_email}

    try:
        import requests
        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": os.environ.get("SENDGRID_FROM_EMAIL", "noreply@example.com")},
            "subject": subject,
            "content": [{"type": "text/html", "value": html}],
        }
        if attachments:
            payload["attachments"] = attachments
        resp = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={"Authorization": f"Bearer {SENDGRID_API_KEY}", "Content-Type": "application/json"},
            data=json.dumps(payload),
            timeout=10,
        )
        if resp.status_code in (200, 202):
            return {"status": "sent", "provider": "sendgrid", "provider_id": resp.headers.get("X-Message-Id", "unknown")}
        return {"status": "error", "provider": "sendgrid", "error": resp.text}
    except Exception as e:
        return {"status": "error", "provider": "sendgrid", "error": str(e)}
