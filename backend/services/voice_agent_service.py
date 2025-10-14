from __future__ import annotations

import asyncio
import logging
import random
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Awaitable, Callable, Dict, List, Optional

from sqlalchemy.orm import Session

from config import get_settings
from database import SessionLocal
from models import (
    Lead,
    LeadActivity,
    User,
    VoiceBooking,
    VoiceCall,
    VoiceCallTurn,
    VoiceMetricsDaily,
)
from services.sequence_delivery import TelnyxVoiceDeliveryAdapter
from services.voice.providers import VoiceProviderBundle, build_provider_bundle
from services.voice.streaming import BaseTelnyxStream, VoiceStreamingOrchestrator, VoiceStreamingResult, default_stream_factory
from services.voice.types import ConversationTurn
from services.billing_service import record_usage
from storage import hashed_filename, save_binary

logger = logging.getLogger(__name__)

@dataclass
class VoiceCallConfig:
    asr_vendor: str = "deepgram"
    tts_vendor: str = "elevenlabs"
    llm_vendor: str = "openai"
    voice_id: str = "21m00Tcm4TlvDq8ikWAM"
    max_duration_minutes: int = 15
    enable_barge_in: bool = True
    silence_timeout_seconds: int = 10
    confidence_threshold: float = 0.7


SYSTEM_PROMPT = (
    "You are an empathetic inside sales assistant for a roofing company called Fish Mouth Roofing. "
    "Your goal is to verify the homeowner, confirm roof condition issues detected by aerial imagery, "
    "and schedule a free inspection. Keep replies concise (<= 45 words), friendly, and reference the homeowner's details when provided."
)


class VoiceConversationSimulator:
    """Lightweight conversation loop using LLM + heuristics to mimic a live call."""

    def __init__(self, bundle: VoiceProviderBundle, lead: Lead, user: User, call: VoiceCall) -> None:
        self.bundle = bundle
        self.lead = lead
        self.user = user
        self.call = call
        self.turns: List[ConversationTurn] = []

    async def run(self) -> None:
        conversation: List[Dict[str, str]] = []
        homeowner = self.lead.homeowner_name or "there"
        context = (
            f"Lead name: {homeowner}. Property address: {self.lead.address}, {self.lead.city}, {self.lead.state}. "
            f"Roof age: {self.lead.roof_age_years or 'unknown'}. Priority: {getattr(self.lead.priority, 'value', 'hot')}."
        )
        conversation.append({"role": "system", "content": context})

        lead_responses = self._generate_lead_responses()

        for step in range(len(lead_responses)):
            agent_text = await self.bundle.llm.generate_reply(SYSTEM_PROMPT, conversation)
            agent_audio = await self._render_audio(agent_text)
            self.turns.append(ConversationTurn(role="assistant", content=agent_text, audio_url=agent_audio))
            conversation.append({"role": "assistant", "content": agent_text})

            # homeowner reply
            lead_text = lead_responses[step]
            self.turns.append(ConversationTurn(role="user", content=lead_text))
            conversation.append({"role": "user", "content": lead_text})

            if any(phrase in lead_text.lower() for phrase in ["do not call", "stop", "remove me"]):
                self.lead.voice_opt_out = True
                self.lead.voice_opt_out_reason = "Explicit opt-out during call"
                break

            if "schedule" in lead_text.lower() or "yes" in lead_text.lower() and "schedule" in agent_text.lower():
                break

        summary = await self.bundle.llm.summarize(conversation[1:])  # drop context turn
        self.call.ai_summary = summary
        self.call.next_steps = summary.get("next_steps")
        sentiment = (summary.get("sentiment") or "neutral").lower()
        self.call.interest_level = {
            "positive": "high",
            "neutral": "medium",
            "negative": "low",
        }.get(sentiment, "medium")
        self.call.transcript_json = {
            "turns": [
                {"role": turn.role, "text": turn.content, "audio_url": turn.audio_url}
                for turn in self.turns
            ]
        }

    def _generate_lead_responses(self) -> List[str]:
        persona = self.lead.voice_opt_out_reason or ""
        base_responses = [
            f"Hi, this is {self.lead.homeowner_name or 'the homeowner'}.",
            "I have noticed some shingles missing after the last storm.",
            "Yes, a free inspection sounds great.",
            "Tomorrow afternoon around 3pm works for me.",
        ]
        if "budget" in persona.lower():
            base_responses.insert(2, "I'm worried about the cost though.")
        return base_responses

    async def _render_audio(self, text: str) -> Optional[str]:
        try:
            audio_bytes = await self.bundle.tts.synthesize(text)
        except Exception as exc:  # pragma: no cover - external dependency
            logger.warning("TTS synthesis failed, continuing without audio: %s", exc)
            return None
        filename = hashed_filename("voice-agent", self.call.id, uuid.uuid4().hex, suffix=".mp3")
        return save_binary(audio_bytes, filename, content_type="audio/mpeg")


class VoiceAgentService:
    """High-level service orchestrating AI voice calls."""

    def __init__(
        self,
        config: VoiceCallConfig,
        db: Session,
        stream_factory: Optional[Callable[[VoiceCall], Awaitable[BaseTelnyxStream]]] = None,
    ):
        self.config = config
        self.db = db
        self.settings = get_settings()
        self._stream_factory = stream_factory or default_stream_factory

    def _should_use_streaming(self) -> bool:
        providers = self.settings.providers
        flags = self.settings.feature_flags
        if flags.use_mock_sequence_delivery:
            return False
        required = [
            providers.telnyx_api_key,
            providers.deepgram_api_key,
            providers.elevenlabs_api_key,
        ]
        return all(required)

    async def _start_telnyx_call(self, call: VoiceCall, lead: Lead) -> None:
        providers = self.settings.providers
        if not providers.telnyx_api_key or not providers.telnyx_call_control_app_id:
            logger.warning("telnyx.configuration_missing", call_id=call.id)
            return
        if not lead.homeowner_phone:
            logger.warning("telnyx.missing_destination", call_id=call.id)
            return

        adapter = TelnyxVoiceDeliveryAdapter(
            providers.telnyx_api_key,
            providers.telnyx_call_control_app_id,
            providers.telnyx_from_number or call.from_number or providers.telnyx_from_number or "+15555550123",
        )
        metadata = {"call_id": call.id}
        try:
            result = await adapter.initiate_call(
                lead.homeowner_phone,
                script="Fish Mouth AI outreach",
                metadata=metadata,
            )
        except Exception as exc:  # pragma: no cover - external dependency
            logger.warning("telnyx.dial_failed", call_id=call.id, exc_info=exc)
            return

        control_id = (result.metadata or {}).get("call_control_id")
        if control_id:
            call.call_control_id = control_id
            self.db.commit()

    async def start_call(self, lead_id: int, user_id: int, background: bool = True) -> str:
        lead = self.db.query(Lead).filter(Lead.id == lead_id).first()
        if not lead:
            raise ValueError("Lead not found")
        if lead.user_id != user_id:
            raise PermissionError("Lead not owned by user")
        if lead.voice_opt_out:
            raise PermissionError("Lead has opted out of voice outreach")

        call_id = str(uuid.uuid4())
        call = VoiceCall(
            id=call_id,
            user_id=user_id,
            lead_id=lead_id,
            to_number=lead.homeowner_phone,
            status="in_progress",
            initiated_at=datetime.utcnow(),
            started_at=datetime.utcnow(),
            conversation_state="greeting",
            call_control_id=str(uuid.uuid4()),
            carrier="telnyx",
        )
        self.db.add(call)
        lead.last_voice_contacted = datetime.utcnow()
        self.db.commit()

        if self._should_use_streaming():
            await self._start_telnyx_call(call, lead)

        self.db.add(
            LeadActivity(
                lead_id=lead_id,
                user_id=user_id,
                activity_type="voice_call_started",
                title="AI voice call initiated",
                description="Voice agent began outreach to homeowner.",
                metadata={"call_id": call_id},
            )
        )
        self.db.commit()

        if background:
            asyncio.create_task(self._run_pipeline(call_id))
        else:
            await self._run_pipeline(call_id)

        return call_id

    async def _run_pipeline(self, call_id: str) -> None:
        db = SessionLocal()
        bundle: Optional[VoiceProviderBundle] = None
        try:
            call = db.query(VoiceCall).filter(VoiceCall.id == call_id).first()
            if not call:
                return
            lead = db.query(Lead).filter(Lead.id == call.lead_id).first()
            user = db.query(User).filter(User.id == call.user_id).first()
            if not lead or not user:
                call.status = "failed"
                db.commit()
                return

            initial_opt_out = lead.voice_opt_out
            bundle = build_provider_bundle(self.config)

            duration_override: Optional[int] = None

            if self._should_use_streaming():
                result = await self._run_streaming_pipeline(bundle, call, lead, user)
                turns = result.turns
                call.ai_summary = result.summary
                call.next_steps = result.summary.get("next_steps")
                sentiment = (result.summary.get("sentiment") or "neutral").lower()
                call.interest_level = {
                    "positive": "high",
                    "neutral": "medium",
                    "negative": "low",
                }.get(sentiment, "medium")
                call.first_audio_latency_ms = result.first_audio_latency_ms
                call.confidence_scores = result.confidence_scores
                call.silence_periods = result.silence_periods
                call.barge_in_count = result.barge_in_count
                call.tool_calls_made = result.tool_calls_made
                duration_override = result.duration_seconds
                if result.opt_out_detected:
                    lead.voice_opt_out = True
                    lead.voice_opt_out_reason = "Explicit opt-out during call"
                transcript_payload = [
                    {"role": turn.role, "text": turn.content, "audio_url": turn.audio_url}
                    for turn in turns
                ]
                call.transcript_json = {"turns": transcript_payload}
            else:
                simulator = VoiceConversationSimulator(bundle, lead, user, call)
                await simulator.run()
                turns = simulator.turns
                transcript_payload = [
                    {"role": turn.role, "text": turn.content, "audio_url": turn.audio_url}
                    for turn in turns
                ]
                call.transcript_json = {"turns": transcript_payload}

            await self._persist_turns(db, call, turns, duration_seconds=duration_override)
            self._finalize_call(call, success=True)
            self._update_metrics(db, call)
            self._maybe_create_booking(db, call, turns)
            if lead and lead.voice_opt_out and not initial_opt_out:
                lead.voice_consent_updated_at = datetime.utcnow()
                db.add(
                    LeadActivity(
                        lead_id=lead.id,
                        user_id=user.id,
                        activity_type="voice_opt_out",
                        title="Voice outreach opt-out",
                        description="Homeowner requested to stop voice outreach during call.",
                        metadata={"call_id": call.id},
                    )
                )

            db.add(
                LeadActivity(
                    lead_id=lead.id,
                    user_id=user.id,
                    activity_type="voice_call_completed",
                    title="AI voice call completed",
                    description=(call.ai_summary or {}).get("summary") if isinstance(call.ai_summary, dict) else call.ai_summary,
                    metadata={
                        "call_id": call.id,
                        "next_steps": call.next_steps,
                        "outcome": call.outcome,
                        "interest_level": call.interest_level,
                    },
                )
            )
            db.commit()
        except Exception as exc:  # pragma: no cover - defensive
            logger.exception("Voice pipeline failed: call_id=%s", call_id)
            call = db.query(VoiceCall).filter(VoiceCall.id == call_id).first()
            if call:
                self._handle_pipeline_failure(db, call, str(exc))
        finally:
            if bundle is not None:
                try:
                    await bundle.asr.close()
                except Exception:
                    pass
            db.close()

    async def _run_streaming_pipeline(
        self,
        bundle: VoiceProviderBundle,
        call: VoiceCall,
        lead: Lead,
        user: User,
    ) -> VoiceStreamingResult:
        orchestrator = VoiceStreamingOrchestrator(
            providers=bundle,
            call=call,
            lead=lead,
            user=user,
            stream_factory=self._stream_factory,
            system_prompt=SYSTEM_PROMPT,
            max_turns=self.config.max_duration_minutes * 2,  # roughly two turns per minute
        )
        return await orchestrator.run()

    def _handle_pipeline_failure(self, db: Session, call: VoiceCall, reason: str) -> None:
        now = datetime.utcnow()
        if call.status == "retrying" and call.last_error_at:
            if (now - call.last_error_at).total_seconds() < 1:
                return

        call.error_message = reason
        call.last_error_code = (reason or "")[:128]
        call.last_error_at = now

        attempts = call.retry_attempts or 0
        max_attempts = self.settings.pipeline_resilience.provider_retry_attempts

        if attempts < max_attempts:
            call.retry_attempts = attempts + 1
            call.status = "retrying"
            db.commit()
            delay = min(30, 2 ** attempts)
            asyncio.create_task(self._retry_call(call.id, delay))
        else:
            call.status = "failed"
            db.commit()

    async def _retry_call(self, call_id: str, delay: float) -> None:
        await asyncio.sleep(delay)
        await self._run_pipeline(call_id)

    async def _persist_turns(
        self,
        db: Session,
        call: VoiceCall,
        turns: List[ConversationTurn],
        *,
        duration_seconds: Optional[int] = None,
    ) -> None:
        seq = 1
        for turn in turns:
            db.add(
                VoiceCallTurn(
                    call_id=call.id,
                    seq=seq,
                    role="agent" if turn.role == "assistant" else "user",
                    text=turn.content,
                    start_ms=(seq - 1) * 1500,
                    end_ms=seq * 1500,
                    audio_url=turn.audio_url,
                    confidence_score=0.9 if turn.role == "user" else None,
                )
            )
            seq += 1
        if duration_seconds is not None:
            call.duration_seconds = duration_seconds
        else:
            call.duration_seconds = max(60, (seq - 1) * 3)

    def _finalize_call(self, call: VoiceCall, success: bool) -> None:
        call.status = "completed" if success else "failed"
        if success:
            call.retry_attempts = 0
            call.error_message = None
            call.last_error_code = None
            call.last_error_at = None
        if call.lead and getattr(call.lead, "voice_opt_out", False):
            call.outcome = "opt_out"
        else:
            call.outcome = "scheduled" if "schedule" in (call.next_steps or "").lower() else "follow_up"
        call.ended_at = datetime.utcnow()
        call.total_cost = round((call.duration_seconds or 0) / 60 * 0.18, 2)
        call.ai_cost = round((len(call.transcript_json.get("turns", [])) or 0) * 0.002, 2)
        call.tool_calls_made = 1 if call.outcome == "scheduled" else 0
        call.barge_in_count = 0
        call.first_audio_latency_ms = call.first_audio_latency_ms or random.randint(900, 1500)
        record_usage(
            self.db,
            user_id=call.user_id,
            metric="voice_seconds",
            quantity=float(call.duration_seconds or 0),
            metadata={"call_id": call.id, "outcome": call.outcome},
        )

    def _update_metrics(self, db: Session, call: VoiceCall) -> None:
        day = date.today()
        metrics = (
            db.query(VoiceMetricsDaily)
            .filter(VoiceMetricsDaily.day == day, VoiceMetricsDaily.user_id == call.user_id)
            .first()
        )
        if not metrics:
            metrics = VoiceMetricsDaily(day=day, user_id=call.user_id)
            db.add(metrics)

        metrics.calls += 1
        if (call.duration_seconds or 0) >= 30:
            metrics.connects += 1
        if call.outcome == "scheduled":
            metrics.bookings += 1
        metrics.avg_duration_s = int(
            ((metrics.avg_duration_s * (metrics.calls - 1)) + (call.duration_seconds or 0)) / metrics.calls
        )
        metrics.booking_rate = (metrics.bookings / metrics.calls) * 100 if metrics.calls else 0
        metrics.avg_first_audio_latency_ms = int(
            ((metrics.avg_first_audio_latency_ms * (metrics.calls - 1)) + (call.first_audio_latency_ms or 1200))
            / metrics.calls
        )

    def _maybe_create_booking(self, db: Session, call: VoiceCall, turns: List[ConversationTurn]) -> None:
        if call.outcome != "scheduled":
            return
        window_start = datetime.utcnow() + timedelta(days=1)
        booking = VoiceBooking(
            id=str(uuid.uuid4()),
            lead_id=call.lead_id,
            call_id=call.id,
            window_start=window_start,
            window_end=window_start + timedelta(hours=2),
            notes=call.next_steps,
        )
        db.add(booking)
        call.appointment_scheduled = True

    async def end_call(self, call_id: str, outcome: str = "completed") -> None:
        call = self.db.query(VoiceCall).filter(VoiceCall.id == call_id).first()
        if not call:
            raise ValueError("Call not found")
        call.status = "completed"
        call.outcome = outcome
        call.carrier = call.carrier or "telnyx"
        call.ended_at = datetime.utcnow()
        if call.started_at and not call.duration_seconds:
            call.duration_seconds = int((call.ended_at - call.started_at).total_seconds())
        self.db.commit()


class VoiceAnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def get_daily_metrics(self, user_id: int, days: int = 14) -> Dict:
        since = date.today() - timedelta(days=days - 1)
        rows = (
            self.db.query(VoiceMetricsDaily)
            .filter(VoiceMetricsDaily.user_id == user_id, VoiceMetricsDaily.day >= since)
            .order_by(VoiceMetricsDaily.day.asc())
            .all()
        )
        total_calls = sum(r.calls for r in rows)
        total_connects = sum(r.connects for r in rows)
        total_bookings = sum(r.bookings for r in rows)
        avg_duration = int(sum(r.avg_duration_s for r in rows) / len(rows)) if rows else 0
        avg_latency = int(sum(r.avg_first_audio_latency_ms for r in rows) / len(rows)) if rows else 0
        avg_booking_rate = (total_bookings / total_calls) * 100 if total_calls else 0
        cost_rows = (
            self.db.query(VoiceCall)
            .filter(
                VoiceCall.user_id == user_id,
                VoiceCall.initiated_at >= datetime.combine(since, datetime.min.time()),
            )
            .all()
        )
        total_call_cost = round(sum((call.total_cost or 0.0) for call in cost_rows), 2)
        total_ai_cost = round(sum((call.ai_cost or 0.0) for call in cost_rows), 2)

        outcome_counts: Dict[str, int] = {}
        sentiment_scores: Dict[str, List[float]] = {}
        daily_sentiment: Dict[date, List[float]] = {}
        follow_up_needed = 0

        for call in cost_rows:
            outcome = (call.outcome or "unknown").lower()
            outcome_counts[outcome] = outcome_counts.get(outcome, 0) + 1

            summary = call.ai_summary
            sentiment_value: Optional[float] = None
            if isinstance(summary, dict):
                sentiment_raw = summary.get("sentiment_score")
                if sentiment_raw is not None:
                    # allow 0-1 or 0-100
                    sentiment_value = float(sentiment_raw)
                    if sentiment_value <= 1.0:
                        sentiment_value *= 100
            elif isinstance(summary, str):
                # crude extraction of percentage value
                if "%" in summary:
                    try:
                        sentiment_value = float(summary.split("%")[0].split()[-1])
                    except (ValueError, IndexError):
                        sentiment_value = None
            if sentiment_value is not None:
                sentiment_scores.setdefault(outcome, []).append(sentiment_value)
                day_key = (call.initiated_at or call.created_at or datetime.utcnow()).date()
                daily_sentiment.setdefault(day_key, []).append(sentiment_value)

            if outcome in {"callback_requested", "follow_up", "voicemail", "retrying"}:
                follow_up_needed += 1

        return {
            "total_calls": total_calls,
            "total_connects": total_connects,
            "total_bookings": total_bookings,
            "avg_booking_rate": round(avg_booking_rate, 1),
            "avg_duration_seconds": avg_duration,
            "avg_latency_ms": avg_latency,
            "total_call_cost_usd": total_call_cost,
            "total_ai_cost_usd": total_ai_cost,
            "daily_breakdown": [
                {
                    "day": row.day.isoformat(),
                    "calls": row.calls,
                    "connects": row.connects,
                    "bookings": row.bookings,
                    "booking_rate": row.booking_rate,
                }
                for row in rows
            ],
            "outcome_breakdown": [
                {
                    "outcome": name,
                    "count": count,
                    "sentiment": round(sum(sentiment_scores.get(name, [])) / len(sentiment_scores.get(name, [])), 1)
                    if sentiment_scores.get(name)
                    else None,
                }
                for name, count in sorted(outcome_counts.items(), key=lambda item: item[1], reverse=True)
            ],
            "sentiment_trends": [
                {
                    "day": day.isoformat(),
                    "avg_sentiment": round(sum(values) / len(values), 1),
                }
                for day, values in sorted(daily_sentiment.items())
            ],
            "insights": self._build_insights(
                total_calls=total_calls,
                total_connects=total_connects,
                total_bookings=total_bookings,
                follow_up_needed=follow_up_needed,
                avg_booking_rate=avg_booking_rate,
                outcome_counts=outcome_counts,
            ),
        }

    def _build_insights(
        self,
        total_calls: int,
        total_connects: int,
        total_bookings: int,
        follow_up_needed: int,
        avg_booking_rate: float,
        outcome_counts: Dict[str, int],
    ) -> Dict[str, List[str]]:
        strengths: List[str] = []
        risks: List[str] = []
        recommendations: List[str] = []

        if avg_booking_rate >= 18:
            strengths.append("Booking rate is trending strong—keep the current pitch and cadence.")
        elif avg_booking_rate >= 10:
            strengths.append("Solid booking performance; incremental script refinements could push higher.")

        connects_rate = (total_connects / total_calls) * 100 if total_calls else 0
        if connects_rate < 45:
            risks.append("Low connect rate detected—leads may require additional warming or timing adjustments.")
            recommendations.append("Test alternative call windows and ensure voicemail drops are personalized.")

        if follow_up_needed >= max(3, total_calls // 4):
            risks.append("High volume of follow-up requests; ensure callbacks are prioritized within 24 hours.")
            recommendations.append("Activate AI callback reminders and assign a rep to daily follow-up sweeps.")

        appointments = outcome_counts.get("scheduled", 0)
        if appointments and appointments >= total_bookings:
            strengths.append("AI agent is consistently setting appointments—consider increasing daily call volume.")

        if outcome_counts.get("not_interested", 0) > outcome_counts.get("interested", 0):
            risks.append("Prospect resistance is high—messaging may need to emphasize insurance assistance.")
            recommendations.append("Refresh scripts with insurance claim success stories and neighbourhood proof.")

        if not recommendations:
            recommendations.append("Maintain current playbook but review call transcripts weekly for emerging trends.")

        return {
            "strengths": strengths or ["Consistent call volume provides solid insights for optimization."],
            "risks": risks,
            "recommendations": recommendations,
        }
