"""AI voice outreach service powered by Telnyx and Vapi.ai."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta
import uuid
from pathlib import Path
from typing import Dict, List, Optional

import httpx
import sqlalchemy as sa
# import telnyx  # Temporarily disabled due to pydantic compatibility issue
from anthropic import Anthropic
# from telnyx import Webhook

from app.core.config import get_settings
from app.core.database import get_db
from app.models import AICall, CallCampaign, FollowUpTask, Property, ScheduledSMS
from app.services.activity_stream import activity_notifier

logger = logging.getLogger(__name__)
settings = get_settings()


class AIVoiceAgentService:
    """Coordinates AI-powered outbound campaigns leveraging Telnyx infrastructure."""

    def __init__(self) -> None:
        providers = settings.providers

        if not providers.vapi_api_key:
            raise RuntimeError("VAPI_API_KEY not configured")
        if not providers.telnyx_api_key:
            raise RuntimeError("TELNYX_API_KEY not configured")
        if not providers.telnyx_from_number:
            raise RuntimeError("TELNYX_PHONE_NUMBER not configured")
        if not providers.telnyx_connection_id:
            raise RuntimeError("TELNYX_CONNECTION_ID not configured")
        if not providers.telnyx_messaging_profile_id:
            raise RuntimeError("TELNYX_MESSAGING_PROFILE_ID not configured")

        telnyx.api_key = providers.telnyx_api_key

        self._vapi_api_key = providers.vapi_api_key
        self._claude = Anthropic(api_key=providers.anthropic_api_key) if providers.anthropic_api_key else None
        self._telnyx_phone = providers.telnyx_from_number
        self._telnyx_connection_id = providers.telnyx_connection_id
        self._telnyx_messaging_profile_id = providers.telnyx_messaging_profile_id

    async def create_call_campaign(
        self,
        lead_ids: List[str],
        contractor_id: str,
        campaign_name: str = "Neighborhood Outreach",
    ) -> Dict[str, object]:
        """Launch an AI calling campaign for a set of properties."""

        db = await get_db()
        try:
            contractor_row = await db.fetch_one(
                sa.text("SELECT * FROM contractors WHERE id = :id"),
                {"id": contractor_id},
            )
            if not contractor_row:
                raise ValueError(f"Contractor {contractor_id} not found")
            contractor = dict(contractor_row)

            campaign_uuid = uuid.uuid4()
            await db.execute(
                sa.insert(CallCampaign).values(
                    id=campaign_uuid,
                    name=campaign_name,
                    contractor_id=contractor_id,
                    lead_count=len(lead_ids),
                )
            )
            campaign_id = str(campaign_uuid)

            calls: List[Dict[str, object]] = []
            for property_id in lead_ids:
                lead_data = await self._get_enriched_lead_data(property_id)
                if not lead_data or not lead_data.get("owner_phone"):
                    logger.warning("voice_agent.lead_missing_phone", lead_id=property_id)
                    continue

                script_json = await self._generate_call_script(lead_data, contractor)
                call_details = await self._create_vapi_call(
                    phone_number=lead_data["owner_phone"],
                    script=script_json,
                    lead_id=property_id,
                    contractor=contractor,
                    campaign_id=campaign_id,
                )
                calls.append(call_details)

            await db.commit()
        finally:
            await db.close()

        activity_notifier.publish(
            "ai_campaign_launched",
            {
                "name": campaign_name,
                "contractor_id": contractor_id,
                "call_count": len(calls),
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

        return {
            "campaign_id": campaign_id,
            "campaign_name": campaign_name,
            "calls_created": len(calls),
            "calls": calls,
            "estimated_cost": round(len(calls) * 0.35, 2),
        }

    async def _get_enriched_lead_data(self, property_id: str) -> Optional[Dict[str, object]]:
        db = await get_db()
        try:
            record = await db.fetch_one(
                sa.text(
                    """
                    SELECT 
                        p.*, 
                        ps.contagion_score,
                        ps.total_urgency_score,
                        ps.urgency_tier,
                        ps.permits_within_quarter_mile,
                        ps.permits_within_500ft,
                        ps.nearest_permit_address,
                        ps.nearest_permit_distance_ft,
                        ps.matches_neighbor_age,
                        ps.recommended_action,
                        cc.permit_count AS cluster_permit_count,
                        cc.cluster_status
                    FROM properties p
                    LEFT JOIN property_scores ps ON p.id = ps.property_id
                    LEFT JOIN contagion_clusters cc ON ps.cluster_id = cc.id
                    WHERE p.id = :pid
                    """
                ),
                {"pid": property_id},
            )
            return dict(record) if record else None
        finally:
            await db.close()

    async def _generate_call_script(self, lead_data: Dict[str, object], contractor: Dict[str, object]) -> str:
        """Generate a conversational script via Claude."""

        if not self._claude:
            raise RuntimeError("ANTHROPIC_API_KEY not configured")

        current_date = datetime.now().strftime("%A, %B %d")
        prompt = (Path(__file__).parent / "templates" / "voice_script_prompt.txt")
        if not prompt.exists():
            prompt_text = self._build_prompt_inline(current_date, lead_data, contractor)
        else:
            prompt_text = prompt.read_text().format(
                current_date=current_date,
                contractor=json.dumps(contractor, default=str),
                lead=json.dumps(lead_data, default=str),
            )

        response = self._claude.messages.create(
            model="claude-3.5-sonnet-20240620",
            max_tokens=1800,
            messages=[{"role": "user", "content": prompt_text}],
        )

        script_text = response.content[0].text
        if "```json" in script_text:
            script_text = script_text.split("```json", 1)[1].split("```", 1)[0].strip()
        return script_text

    def _build_prompt_inline(self, current_date: str, lead: Dict[str, object], contractor: Dict[str, object]) -> str:
        return f"""
You are creating a call script for an AI voice agent representing {contractor.get('company_name')}, a professional roofing company.

LEAD INFORMATION:
- Name: {lead.get('owner_name') or 'Homeowner'}
- Address: {lead.get('address')}
- Home built: {lead.get('year_built')}
- Phone: {lead.get('owner_phone')}

URGENCY ANALYSIS:
- Total Score: {lead.get('total_urgency_score')}/100 ({lead.get('urgency_tier')})
- Contagion Score: {lead.get('contagion_score')}/40
- Neighbors replaced (0.25mi): {lead.get('permits_within_quarter_mile')} properties
- Nearest replacement: {lead.get('nearest_permit_address')} ({lead.get('nearest_permit_distance_ft')}ft away)
- Roof age matches neighbors: {lead.get('matches_neighbor_age')}

CONTRACTOR INFO:
- Company: {contractor.get('company_name')}
- Phone: {contractor.get('phone')}
- License: {contractor.get('license_number')}

Today is {current_date}.

Create a natural, conversational AI call script that:

1. OPENING (15 seconds)
   - Warm introduction as {contractor.get('company_name')}'s assistant
   - Establish neighborhood credibility immediately

2. REASON FOR CALL (20 seconds)
   - Explain crews are already scheduled on the street this week
   - Offer FREE roof inspection (emphasize FREE at least 3 times)
   - Create soft urgency tied to neighborhood momentum

3. SOCIAL PROOF (15 seconds)
   - Reference nearby replacements, use actual addresses when available
   - Mention year built similarities for subdivision homes

4. VALUE PROPOSITION (15 seconds)
   - FREE 15-20 minute inspection
   - Includes professional aerial report
   - Neighborhood discount (10-15%) while crews are nearby
   - Zero obligation

5. APPOINTMENT BOOKING (20 seconds)
   - Offer two time slots (e.g., Thursday 2pm or Friday 10am)
   - Provide alternative slot if homeowner hesitates
   - Confirm and mention SMS confirmation

6. OBJECTION HANDLING
   - Provide empathetic, persuasive responses for:
     * not_interested
     * cost_question
     * need_spouse
     * recently_inspected

7. CLOSING
   - Confirm appointment time if booked
   - Promise a text confirmation with inspector details
   - Ask if there is anything specific to check

CRITICAL RULES:
- Sound human and friendly (use contractions, natural pacing)
- Emphasize the inspection is FREE multiple times
- Use neighborhood specifics: addresses, permit counts, subdivision references
- Avoid quoting pricing over the phone
- If homeowner asks if call is recorded, respond \"No, I'm an AI assistant for {contractor.get('company_name')} here to help schedule your free inspection.\"
- End warmly whether they book or decline

Format the response as compact JSON:
{{
  "opening": "...",
  "main_pitch": "...",
  "appointment_ask": "...",
  "objection_responses": {{
    "not_interested": "...",
    "cost_question": "...",
    "need_spouse": "...",
    "recently_inspected": "..."
  }},
  "closing": "..."
}}
"""

    async def _create_vapi_call(
        self,
        phone_number: str,
        script: str,
        lead_id: str,
        contractor: Dict[str, object],
        campaign_id: Optional[str],
    ) -> Dict[str, object]:
        """Initiate a Vapi.ai call using Telnyx as the carrier."""

        script_data = json.loads(script)
        assistant_payload = {
            "assistant": {
                "firstMessage": script_data.get("opening", ""),
                "model": {
                    "provider": "anthropic",
                    "model": "claude-3.5-sonnet-20240620",
                    "systemPrompt": self._build_system_prompt(script_data, contractor),
                },
                "voice": {
                    "provider": "11labs",
                    "voiceId": "ErXwobaYiN019PkySvjV",
                    "stability": 0.4,
                    "similarityBoost": 0.7,
                },
                "backgroundSound": "office",
            },
            "phoneNumber": {
                "telnyxPhoneNumber": self._telnyx_phone,
                "telnyxConnectionId": self._telnyx_connection_id,
            },
            "customer": {"number": phone_number},
            "metadata": {
                "lead_id": lead_id,
                "contractor_id": contractor.get("id"),
                "campaign_id": campaign_id,
            },
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "https://api.vapi.ai/call",
                headers={
                    "Authorization": f"Bearer {self._vapi_api_key}",
                    "Content-Type": "application/json",
                },
                json=assistant_payload,
            )
            response.raise_for_status()
            call_payload = response.json()

        call_record = {
            "id": call_payload.get("id"),
            "telnyx_call_id": call_payload.get("callControlId"),
            "campaign_id": campaign_id,
            "lead_id": lead_id,
            "phone": phone_number,
        }

        db = await get_db()
        try:
            await db.execute(
                sa.insert(AICall).values(
                    id=call_record["id"],
                    lead_id=lead_id,
                    contractor_id=contractor["id"],
                    campaign_id=uuid.UUID(campaign_id) if campaign_id else None,
                    phone_number=phone_number,
                    status="initiated",
                    metadata=script_data,
                    telnyx_call_id=call_payload.get("callControlId"),
                    vapi_session_id=call_payload.get("sessionId"),
                )
            )
            await db.commit()
        finally:
            await db.close()

        activity_notifier.publish(
            "ai_call_initiated",
            {
                "lead_id": lead_id,
                "call_id": call_record["id"],
                "phone": phone_number,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

        return call_record

    def _build_system_prompt(self, script: Dict[str, object], contractor: Dict[str, object]) -> str:
        return f"""
You are a friendly AI assistant for {contractor.get('company_name')}.
Your mission is to book a FREE roof inspection while sounding natural.

SCRIPT GUIDELINES:
{script.get('main_pitch', '')}

APPOINTMENT BOOKING:
{script.get('appointment_ask', '')}

OBJECTION HANDLING:
{json.dumps(script.get('objection_responses', {}), indent=2)}

CLOSING:
{script.get('closing', '')}
"""

    async def handle_call_completed(self, call_id: str, outcome: Dict[str, object]) -> None:
        """Persist call outcome and trigger follow-up workflows."""

        db = await get_db()
        try:
            appointment_booked = bool(outcome.get("appointment_booked"))
            appointment_time = outcome.get("appointment_time")
            duration = outcome.get("duration_seconds") or 0

            await db.execute(
                sa.update(AICall)
                .where(AICall.id == call_id)
                .values(
                    status="completed",
                    outcome="booked" if appointment_booked else outcome.get("outcome", "completed"),
                    appointment_booked=appointment_booked,
                    duration_seconds=duration,
                    completed_at=datetime.utcnow(),
                )
            )

            call_info = await db.fetch_one(
                sa.text(
                    """
                    SELECT ac.lead_id, p.owner_phone, p.owner_name, p.address, ac.contractor_id
                    FROM ai_calls ac
                    JOIN properties p ON ac.lead_id = p.id
                    WHERE ac.id = :call_id
                    """
                ),
                {"call_id": call_id},
            )

            if call_info and appointment_booked:
                appointment_dt = (
                    datetime.fromisoformat(appointment_time)
                    if isinstance(appointment_time, str)
                    else appointment_time
                )
                await self._send_telnyx_sms(
                    to_phone=call_info["owner_phone"],
                    message=self._format_confirmation(call_info["owner_name"], call_info["address"], appointment_dt),
                )

                await db.execute(
                    sa.update(Property)
                    .where(Property.id == call_info["lead_id"])
                    .values(
                        lead_status="appointment_booked",
                        appointment_date=appointment_dt,
                        updated_at=datetime.utcnow(),
                    )
                )
            elif call_info:
                retry_time = datetime.utcnow() + timedelta(days=1)
                await db.execute(
                    sa.insert(FollowUpTask).values(
                        id=uuid.uuid4(),
                        lead_id=call_info["lead_id"],
                        task_type="retry_call",
                        scheduled_for=retry_time,
                    )
                )

            await db.commit()
        finally:
            await db.close()

        activity_notifier.publish(
            "ai_call_completed",
            {
                "call_id": call_id,
                "appointment_booked": appointment_booked,
                "timestamp": datetime.utcnow().isoformat(),
            },
        )

    async def _send_telnyx_sms(self, to_phone: str, message: str) -> None:
        telnyx.Message.create(
            from_=self._telnyx_phone,
            to=to_phone,
            text=message,
            messaging_profile_id=self._telnyx_messaging_profile_id,
        )

    async def send_followup_sequence(self, lead_id: str, sequence_type: str = "no_answer") -> None:
        sequences = {
            "no_answer": [
                (24, "We tried calling about your FREE roof inspection. Text YES to book while crews are on your street."),
                (72, "Final reminder: Neighborhood pricing active this week. Reply YES to secure your free inspection slot."),
                (120, "We moved to the next subdivision but here's a look at what neighbors found: fishmouth.io/report-preview"),
            ],
            "interested": [
                (12, "Thanks for chatting! We have Thu 2pm, Fri 10am, or Sat 9am open. Reply with your preferred time."),
                (48, "Quick reminder: Your neighbor at the highlighted address booked yesterday. Want the same? Reply YES."),
            ],
        }["interested" if sequence_type == "interested_but_not_booked" else sequence_type]

        db = await get_db()
        try:
            for delay_hours, text in sequences:
                await db.execute(
                    sa.insert(ScheduledSMS).values(
                        id=uuid.uuid4(),
                        lead_id=lead_id,
                        message=text,
                        send_at=datetime.utcnow() + timedelta(hours=delay_hours),
                        provider="telnyx",
                        delivery_status="queued",
                    )
            )
            await db.commit()
        finally:
            await db.close()

        activity_notifier.publish(
            "follow_up_scheduled",
            {"lead_id": lead_id, "sequence_type": sequence_type, "timestamp": datetime.utcnow().isoformat()},
        )

    @staticmethod
    def verify_telnyx_webhook(payload: bytes, signature: Optional[str], timestamp: Optional[str]) -> bool:
        public_key = settings.providers.telnyx_webhook_public_key
        if not public_key or not signature or not timestamp:
            return False
        try:
            Webhook.construct_event(payload.decode("utf-8"), signature, timestamp, public_key)
            return True
        except Exception:
            return False

    def _format_confirmation(self, name: str, address: str, appointment_time: datetime) -> str:
        formatted_time = appointment_time.strftime("%A, %B %d at %I:%M %p")
        return (
            f"Hi {name}! Your FREE roof inspection is locked in for {formatted_time} at {address}.\n"
            "Our inspector will text you 30 minutes before arrival. Reply with any questions!"
        )
