"""Direct mail automation using external print API (mock)."""

from __future__ import annotations

import asyncio
import logging
import secrets
from datetime import datetime
from typing import Dict, List, Optional

import httpx
import sqlalchemy as sa

from app.core.config import get_settings
from app.core.database import get_db
from app.models import MailCampaign, MailJob
from app.services.activity_stream import activity_notifier

logger = logging.getLogger(__name__)
settings = get_settings()

PRINT_API_BASE = settings.providers.direct_mail_api_base or "https://print-api.mock"
PRINT_API_KEY = settings.providers.direct_mail_api_key

DEFAULT_TEMPLATES: Dict[str, Dict[str, str]] = {
    "impact": {
        "name": "Impact Pamphlet",
        "headline": "Your neighbors just replaced their roofs. We can help you next!",
        "body": "Our crews are already scheduled on your street. Book a free inspection and lock in neighborhood pricing.",
        "cta": "Schedule Your Free Roof Inspection",
    },
    "heritage": {
        "name": "Heritage Showcase",
        "headline": "Premium craftsmanship backed by 25-year workmanship warranty",
        "body": "From hail-resistant shingles to insurance claim support, we manage roofing with zero headaches.",
        "cta": "Discover Our Recent Projects",
    },
    "storm_alert": {
        "name": "Storm Damage Alert",
        "headline": "Recent storms hit your subdivision. Protect your roof before the next front.",
        "body": "We offer same-week inspections with drone imagery and AI damage assessments.",
        "cta": "Claim Your Priority Inspection Slot",
    },
}


class MailService:
    """Schedules, submits, and tracks direct mail pamphlet jobs."""

    @staticmethod
    async def list_templates() -> List[Dict[str, str]]:
        return [
            {"key": key, **value}
            for key, value in DEFAULT_TEMPLATES.items()
        ]

    @staticmethod
    async def create_campaign(contractor_id: str, name: str, template_key: str, lead_ids: List[str], schedule_for: Optional[datetime] = None) -> Dict[str, object]:
        if template_key not in DEFAULT_TEMPLATES:
            raise ValueError("Unknown template")
        if not lead_ids:
            raise ValueError("No lead ids provided")

        db = await get_db()
        try:
            campaign_row = await db.fetch_one(
                sa.text(
                    """
                    INSERT INTO mail_campaigns (id, contractor_id, name, template_key, status, created_at, scheduled_for)
                    VALUES (gen_random_uuid(), :contractor, :name, :template, 'draft', NOW(), :scheduled_for)
                    RETURNING id
                    """
                ),
                {
                    "contractor": contractor_id,
                    "name": name,
                    "template": template_key,
                    "scheduled_for": schedule_for,
                },
            )
            campaign_id = campaign_row["id"]

            for lead_id in lead_ids:
                property_row = await db.fetch_one(
                    sa.text(
                        """
                        SELECT id, owner_name, address, city, state, zip_code
                        FROM properties
                        WHERE id = :id
                        """
                    ),
                    {"id": lead_id},
                )
                if not property_row:
                    continue

                await db.execute(
                    sa.insert(MailJob).values(
                        campaign_id=campaign_id,
                        property_id=lead_id,
                        recipient_name=property_row["owner_name"],
                        address=property_row["address"],
                        city=property_row["city"],
                        state=property_row["state"],
                        postal_code=property_row["zip_code"],
                        status="queued",
                    )
                )

            await db.commit()
        finally:
            await db.close()

        return {"campaign_id": str(campaign_id), "lead_count": len(lead_ids)}

    @staticmethod
    async def submit_campaign(campaign_id: str) -> Dict[str, object]:
        db = await get_db()
        try:
            campaign = await db.fetch_one(
                sa.text("SELECT * FROM mail_campaigns WHERE id = :id"),
                {"id": campaign_id},
            )
            if not campaign:
                raise ValueError("Campaign not found")

            jobs = await db.fetch_all(
                sa.text("SELECT * FROM mail_jobs WHERE campaign_id = :id AND status = 'queued'"),
                {"id": campaign_id},
            )

            responses = []
            for job in jobs:
                payload = {
                    "recipient": {
                        "name": job["recipient_name"] or "Homeowner",
                        "address": job["address"],
                        "city": job["city"],
                        "state": job["state"],
                        "postal_code": job["postal_code"],
                    },
                    "template": campaign["template_key"],
                    "metadata": {
                        "campaign_id": campaign_id,
                        "job_id": str(job["id"]),
                    },
                }
                provider_resp = await MailService._post_to_print_provider(payload)

                await db.execute(
                    sa.update(MailJob)
                    .where(MailJob.id == job["id"])
                    .values(
                        status="submitted",
                        provider_job_id=provider_resp.get("job_id"),
                        cost_usd=provider_resp.get("cost_usd"),
                        submitted_at=datetime.utcnow(),
                    )
                )
                responses.append(provider_resp)

            await db.execute(
                sa.update(MailCampaign)
                .where(MailCampaign.id == campaign_id)
                .values(status="sent", scheduled_for=datetime.utcnow())
            )
            await db.commit()
        finally:
            await db.close()

        asyncio.create_task(MailService._simulate_delivery(campaign_id))
        activity_notifier.publish(
            "mail_campaign_submitted",
            {"campaign_id": campaign_id, "submitted": len(responses), "timestamp": datetime.utcnow().isoformat()},
        )
        return {"submitted": len(responses), "provider_responses": responses}

    @staticmethod
    async def _post_to_print_provider(payload: Dict[str, object]) -> Dict[str, object]:
        mock_response = {
            "job_id": f"PJ-{secrets.token_hex(4)}",
            "status": "submitted",
            "cost_usd": 1.29,
        }
        if PRINT_API_KEY and PRINT_API_BASE:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    response = await client.post(
                        f"{PRINT_API_BASE.rstrip('/')}/mailers",
                        headers={"Authorization": f"Bearer {PRINT_API_KEY}"},
                        json=payload,
                    )
                    response.raise_for_status()
                    data = response.json()
                    mock_response.update({
                        "job_id": data.get("id", mock_response["job_id"]),
                        "status": data.get("status", "submitted"),
                        "cost_usd": data.get("cost_usd", mock_response["cost_usd"]),
                    })
            except Exception as exc:  # noqa: BLE001
                logger.warning("print_api.error", error=str(exc))
        return mock_response

    @staticmethod
    async def _simulate_delivery(campaign_id: str) -> None:
        await asyncio.sleep(5)
        db = await get_db()
        try:
            await db.execute(
                sa.update(MailJob)
                .where(MailJob.campaign_id == campaign_id)
                .values(status="delivered")
            )
            await db.commit()
        finally:
            await db.close()
        activity_notifier.publish(
            "mail_campaign_delivered",
            {"campaign_id": campaign_id, "timestamp": datetime.utcnow().isoformat()},
        )
