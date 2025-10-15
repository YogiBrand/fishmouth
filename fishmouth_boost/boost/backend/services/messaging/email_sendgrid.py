# boost/backend/services/messaging/email_sendgrid.py
from typing import List, Dict, Any, Optional

class SendGridEmailProvider:
    def __init__(self, api_key: str, dry_run: bool = False):
        self.api_key = api_key; self.dry_run = dry_run
    def send(self, to: List[str], subject: str, html: Optional[str]=None, text: Optional[str]=None,
             attachments: Optional[List[Dict[str, Any]]]=None, categories: Optional[List[str]]=None) -> Dict[str, Any]:
        payload = {"to":to,"subject":subject,"html":html,"text":text,"attachments":attachments or [],"categories":categories or []}
        if self.dry_run: return {"provider":"sendgrid","status":"queued","id":"dryrun","payload":payload}
        # TODO: real API call
        return {"provider":"sendgrid","status":"queued","id":"mock123","payload":payload}
