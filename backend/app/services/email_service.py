"""Email service for sending property reports via SendGrid."""

from __future__ import annotations

import base64
import logging

import httpx
from pathlib import Path
from datetime import datetime
from typing import Dict

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Attachment, Disposition, FileContent, FileName, FileType, Mail

from app.core.config import get_settings


logger = logging.getLogger(__name__)
settings = get_settings()


class EmailService:
    """Encapsulate SendGrid email delivery for PDF reports."""

    def __init__(self) -> None:
        api_key = settings.providers.sendgrid_api_key
        if not api_key:
            raise RuntimeError("SENDGRID_API_KEY not configured")
        self._client = SendGridAPIClient(api_key)

    async def send_report_email(
        self,
        to_email: str,
        pdf_url: str,
        property_address: str,
        contractor_name: str,
        contractor_phone: str,
    ) -> Dict[str, object]:
        pdf_bytes = await self._download_pdf(pdf_url)
        attachment = Attachment(
            FileContent(base64.b64encode(pdf_bytes).decode()),
            FileName(f"roof_inspection_{property_address.replace(' ', '_')}.pdf"),
            FileType("application/pdf"),
            Disposition("attachment"),
        )

        html_content = self._render_email(property_address, contractor_name, contractor_phone)
        message = Mail(
            from_email=f"{contractor_name} <reports@fishmouth.io>",
            to_emails=to_email,
            subject=f"Your Roof Inspection Report - {property_address}",
            html_content=html_content,
        )
        message.attachment = attachment

        try:
            response = self._client.send(message)
            return {"status": "sent", "status_code": response.status_code}
        except Exception as exc:  # noqa: BLE001
            logger.exception("email_service.send_failed", error=str(exc))
            raise

    async def _download_pdf(self, pdf_url: str) -> bytes:
        if pdf_url.startswith("/uploads/"):
            file_path = Path("uploads") / pdf_url.split("/uploads/")[1]
            return file_path.read_bytes()

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(pdf_url)
            response.raise_for_status()
            return response.content

    @staticmethod
    def _render_email(property_address: str, contractor_name: str, contractor_phone: str) -> str:
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }}
                .cta-button {{ display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 5px; }}
                .footer {{ text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Your Professional Roof Assessment</h1>
                    <p>{property_address}</p>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>Attached is your comprehensive roof inspection report for <strong>{property_address}</strong>.</p>
                    <p>Ready to take the next step?</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="tel:{contractor_phone}" class="cta-button">📞 Call {contractor_name}</a>
                        <a href="mailto:reports@fishmouth.io" class="cta-button">✉️ Email Us</a>
                    </div>
                    <p>We look forward to helping you protect your home.</p>
                    <p>Best regards,<br><strong>{contractor_name}</strong></p>
                </div>
                <div class="footer">
                    <p>This email was sent because you requested a roof inspection report.</p>
                    <p>© {datetime.utcnow().year} {contractor_name}. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
