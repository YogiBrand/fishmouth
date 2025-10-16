from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import os, smtplib
from email.message import EmailMessage

router = APIRouter(tags=["messaging-send"])

class SendReq(BaseModel):
    to_email: EmailStr
    subject: str
    text: str

@router.post("/messaging/send/smtp")
def send_smtp(req: SendReq):
    host = os.getenv("SMTP_HOST")
    port = int(os.getenv("SMTP_PORT","587"))
    user = os.getenv("SMTP_USER")
    pwd  = os.getenv("SMTP_PASS")
    from_email = os.getenv("FROM_EMAIL", user)
    from_name  = os.getenv("FROM_NAME","FishMouth")

    if not (host and user and pwd and from_email):
        raise HTTPException(400,"SMTP env incomplete")

    msg = EmailMessage()
    msg["Subject"] = req.subject
    msg["From"] = f"{from_name} <{from_email}>"
    msg["To"] = req.to_email
    msg.set_content(req.text)

    with smtplib.SMTP(host, port) as s:
        s.starttls()
        s.login(user, pwd)
        s.send_message(msg)

    return {"ok": True}
