"""Real-time media streaming orchestration for Telnyx voice calls."""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
import uuid
from contextlib import suppress
from dataclasses import dataclass, field
from typing import AsyncIterator, Awaitable, Callable, Dict, List, Optional

from fastapi import WebSocket, WebSocketDisconnect

from models import Lead, User, VoiceCall
from services.voice.providers import ASRResult, VoiceProviderBundle
from services.voice.types import ConversationTurn
from storage import hashed_filename, save_binary

logger = logging.getLogger(__name__)


class TelnyxStreamError(Exception):
    """Raised when the Telnyx media stream encounters an unrecoverable error."""


class BaseTelnyxStream:
    """Abstract base class describing Telnyx media stream behaviour."""

    def __init__(self, call_control_id: str) -> None:
        self.call_control_id = call_control_id

    async def incoming_audio(self) -> AsyncIterator[bytes]:  # pragma: no cover - interface
        raise NotImplementedError

    async def send_audio(self, audio: bytes) -> None:  # pragma: no cover - interface
        raise NotImplementedError

    async def close(self) -> None:  # pragma: no cover - interface
        raise NotImplementedError


class InMemoryTelnyxStream(BaseTelnyxStream):
    """Simple in-memory stream used for testing the orchestration pipeline."""

    def __init__(self, call_control_id: str) -> None:
        super().__init__(call_control_id)
        self._incoming: asyncio.Queue[Optional[bytes]] = asyncio.Queue()
        self._outgoing: List[bytes] = []
        self._closed = asyncio.Event()

    async def incoming_audio(self) -> AsyncIterator[bytes]:
        while not self._closed.is_set():
            chunk = await self._incoming.get()
            if chunk is None:
                break
            yield chunk

    async def send_audio(self, audio: bytes) -> None:
        self._outgoing.append(audio)

    async def close(self) -> None:
        self._closed.set()
        await self._incoming.put(None)

    async def push_audio(self, audio: bytes) -> None:
        """Utility used by tests to simulate Telnyx media frames."""

        await self._incoming.put(audio)

    @property
    def sent_audio(self) -> List[bytes]:
        return self._outgoing


_stream_registry: Dict[str, asyncio.Future[BaseTelnyxStream]] = {}
_registry_lock = asyncio.Lock()


async def register_stream(control_id: str, stream: BaseTelnyxStream) -> None:
    async with _registry_lock:
        future = _stream_registry.get(control_id)
        if future and not future.done():
            future.set_result(stream)
        else:
            loop = asyncio.get_event_loop()
            fut: asyncio.Future[BaseTelnyxStream] = loop.create_future()
            fut.set_result(stream)
            _stream_registry[control_id] = fut


async def wait_for_registered_stream(control_id: str, timeout: float = 15.0) -> BaseTelnyxStream:
    async with _registry_lock:
        future = _stream_registry.get(control_id)
        if future is None:
            loop = asyncio.get_event_loop()
            future = loop.create_future()
            _stream_registry[control_id] = future
    return await asyncio.wait_for(future, timeout=timeout)


async def release_stream(control_id: str) -> None:
    async with _registry_lock:
        existing = _stream_registry.pop(control_id, None)
        if existing and not existing.done():
            existing.cancel()


@dataclass
class VoiceStreamingResult:
    """Aggregated outcome from a streaming session."""

    turns: List[ConversationTurn]
    summary: Dict[str, str]
    conversation: List[Dict[str, str]]
    duration_seconds: int
    confidence_scores: List[float] = field(default_factory=list)
    silence_periods: List[float] = field(default_factory=list)
    first_audio_latency_ms: Optional[int] = None
    barge_in_count: int = 0
    tool_calls_made: int = 0
    opt_out_detected: bool = False


class WebsocketTelnyxStream(BaseTelnyxStream):
    """Real Telnyx media stream backed by a FastAPI WebSocket connection."""

    def __init__(self, websocket: WebSocket, call_control_id: str) -> None:
        super().__init__(call_control_id)
        self._websocket = websocket
        self._closed = False
        self._closed_event = asyncio.Event()

    async def incoming_audio(self) -> AsyncIterator[bytes]:
        try:
            while True:
                message = await self._websocket.receive_text()
                data = json.loads(message)
                if data.get("event") != "media":
                    continue
                payload = data.get("media", {}).get("payload")
                if not payload:
                    continue
                try:
                    yield base64.b64decode(payload)
                except Exception:  # pragma: no cover - malformed payload
                    continue
        except WebSocketDisconnect:
            self._closed_event.set()
            return

    async def send_audio(self, audio: bytes) -> None:
        payload = base64.b64encode(audio).decode("utf-8")
        message = json.dumps({"event": "media", "media": {"payload": payload}})
        await self._websocket.send_text(message)

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        with suppress(Exception):
            await self._websocket.close()
        self._closed_event.set()

    async def wait_closed(self) -> None:
        await self._closed_event.wait()


class VoiceStreamingOrchestrator:
    """Bridge Telnyx media streams with ASR, LLM, and TTS providers."""

    def __init__(
        self,
        *,
        providers: VoiceProviderBundle,
        call: VoiceCall,
        lead: Lead,
        user: User,
        stream_factory: Callable[[VoiceCall], Awaitable[BaseTelnyxStream]],
        system_prompt: str,
        max_turns: int = 6,
    ) -> None:
        self.providers = providers
        self.call = call
        self.lead = lead
        self.user = user
        self._stream_factory = stream_factory
        self.system_prompt = system_prompt
        self.max_turns = max_turns

        self.turns: List[ConversationTurn] = []
        self.conversation: List[Dict[str, str]] = []
        self.confidence_scores: List[float] = []
        self.silence_periods: List[float] = []
        self.opt_out_detected = False
        self._first_audio_latency_ms: Optional[int] = None
        self._first_audio_sent = False
        self._reply_lock = asyncio.Lock()
        self._stop_event = asyncio.Event()
        self._start_time = time.monotonic()
        self._stream: Optional[BaseTelnyxStream] = None

    async def run(self) -> VoiceStreamingResult:
        """Entry point that executes the streaming session."""

        stream = await self._stream_factory(self.call)
        self._stream = stream
        self._prepare_system_context()
        await self._send_initial_greeting()

        consume_media = asyncio.create_task(self._consume_media_stream())
        consume_asr = asyncio.create_task(self._consume_asr_results())

        try:
            await asyncio.wait(
                [consume_media, consume_asr],
                return_when=asyncio.FIRST_EXCEPTION,
            )
        finally:
            self._stop_event.set()
            consume_media.cancel()
            consume_asr.cancel()
            with suppress(asyncio.CancelledError):
                await consume_media
            with suppress(asyncio.CancelledError):
                await consume_asr
            await self.providers.asr.close()
            await stream.close()
            await release_stream(self.call.call_control_id or self.call.id)

        summary = await self._summarize()
        duration_seconds = max(1, int(time.monotonic() - self._start_time))

        return VoiceStreamingResult(
            turns=self.turns,
            summary=summary,
            conversation=self.conversation,
            duration_seconds=duration_seconds,
            confidence_scores=self.confidence_scores,
            silence_periods=self.silence_periods,
            first_audio_latency_ms=self._first_audio_latency_ms,
            barge_in_count=0,
            tool_calls_made=0,
            opt_out_detected=self.opt_out_detected,
        )

    def _prepare_system_context(self) -> None:
        homeowner = self.lead.homeowner_name or "there"
        context = (
            f"Lead name: {homeowner}. Property address: {self.lead.address}, {self.lead.city}, {self.lead.state}. "
            f"Roof age: {self.lead.roof_age_years or 'unknown'}. Priority: {getattr(self.lead.priority, 'value', 'hot')}."
        )
        self.conversation = [
            {"role": "system", "content": context},
        ]

    async def _send_initial_greeting(self) -> None:
        greeting = await self.providers.llm.generate_reply(self.system_prompt, self.conversation)
        await self._emit_agent_turn(greeting)

    async def _consume_media_stream(self) -> None:
        assert self._stream is not None
        async for chunk in self._stream.incoming_audio():
            if self._stop_event.is_set():
                break
            try:
                await self.providers.asr.submit_audio(chunk)
            except Exception as exc:  # pragma: no cover - external failure path
                logger.warning("telnyx.audio.submit_failed", exc_info=exc)
                self._stop_event.set()
                break

    async def _consume_asr_results(self) -> None:
        async for result in self.providers.asr.stream():
            if self._stop_event.is_set():
                break
            if not result.text:
                continue
            await self._handle_asr_result(result)

    async def _handle_asr_result(self, result: ASRResult) -> None:
        self.confidence_scores.append(result.confidence)
        self.turns.append(ConversationTurn(role="user", content=result.text))
        self.conversation.append({"role": "user", "content": result.text})

        lowered = result.text.lower()
        if any(phrase in lowered for phrase in ["do not call", "stop calling", "remove me", "opt out"]):
            self.opt_out_detected = True
            self._stop_event.set()
            return

        if not result.is_final:
            return

        if self._assistant_turn_count() >= self.max_turns:
            self._stop_event.set()
            return

        await self._respond_to_transcript()

    async def _respond_to_transcript(self) -> None:
        async with self._reply_lock:
            agent_text = await self.providers.llm.generate_reply(self.system_prompt, self.conversation)
            await self._emit_agent_turn(agent_text)

    async def _emit_agent_turn(self, agent_text: str) -> None:
        audio_bytes: Optional[bytes] = None
        try:
            audio_bytes = await self.providers.tts.synthesize(agent_text)
        except Exception as exc:  # pragma: no cover - external dependency
            logger.warning("tts.synthesize_failed", exc_info=exc)

        audio_url = None
        if audio_bytes:
            audio_url = self._persist_audio(audio_bytes)
            await self._send_audio_to_stream(audio_bytes)

        self.turns.append(ConversationTurn(role="assistant", content=agent_text, audio_url=audio_url))
        self.conversation.append({"role": "assistant", "content": agent_text})

    async def _send_audio_to_stream(self, audio_bytes: bytes) -> None:
        assert self._stream is not None
        try:
            await self._stream.send_audio(audio_bytes)
        except Exception as exc:  # pragma: no cover - external failure path
            logger.warning("telnyx.audio.send_failed", exc_info=exc)
            self._stop_event.set()
            return

        if not self._first_audio_sent:
            self._first_audio_sent = True
            self._first_audio_latency_ms = int((time.monotonic() - self._start_time) * 1000)

    def _persist_audio(self, audio_bytes: bytes) -> Optional[str]:
        try:
            filename = hashed_filename("voice-agent", self.call.id, uuid.uuid4().hex, suffix=".mp3")
            return save_binary(audio_bytes, filename, content_type="audio/mpeg")
        except Exception as exc:  # pragma: no cover - storage failure
            logger.warning("audio.persist_failed", exc_info=exc)
            return None

    async def _summarize(self) -> Dict[str, str]:
        try:
            return await self.providers.llm.summarize(self.conversation[1:])  # drop system context
        except Exception as exc:  # pragma: no cover - external failure
            logger.warning("llm.summarize_failed", exc_info=exc)
            return {"summary": "", "next_steps": "", "sentiment": "neutral"}

    def _assistant_turn_count(self) -> int:
        return sum(1 for turn in self.turns if turn.role == "assistant")


async def default_stream_factory(call: VoiceCall) -> BaseTelnyxStream:
    """Wait for a Telnyx websocket stream; fall back to in-memory when absent."""

    control_id = call.call_control_id or call.id
    try:
        return await wait_for_registered_stream(control_id, timeout=20.0)
    except asyncio.TimeoutError:
        await release_stream(control_id)
        logger.warning(
            "telnyx.stream.timeout",
            extra={"call_id": call.id, "call_control_id": call.call_control_id},
        )
        return InMemoryTelnyxStream(control_id)
