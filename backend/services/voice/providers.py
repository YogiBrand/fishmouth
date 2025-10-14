"""Voice provider integrations and fallbacks for ASR, TTS, and LLM."""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import AsyncIterator, Dict, List, Optional

import httpx

from config import get_settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Dataclasses / base interfaces
# ---------------------------------------------------------------------------


@dataclass
class ASRResult:
    text: str
    confidence: float
    is_final: bool = True
    words: Optional[List[Dict]] = None


class BaseASRProvider:
    async def stream(self) -> AsyncIterator[ASRResult]:  # pragma: no cover - interface
        raise NotImplementedError

    async def submit_audio(self, chunk: bytes) -> None:  # pragma: no cover - interface
        raise NotImplementedError

    async def close(self) -> None:  # pragma: no cover - interface
        raise NotImplementedError


class BaseTTSProvider:
    async def synthesize(self, text: str) -> bytes:  # pragma: no cover - interface
        raise NotImplementedError


class BaseLLMProvider:
    async def generate_reply(self, system_prompt: str, conversation: List[Dict[str, str]]) -> str:  # pragma: no cover
        raise NotImplementedError

    async def summarize(self, conversation: List[Dict[str, str]]) -> Dict[str, str]:  # pragma: no cover
        raise NotImplementedError


# ---------------------------------------------------------------------------
# Mock providers for local/demo usage
# ---------------------------------------------------------------------------


class MockASRProvider(BaseASRProvider):
    def __init__(self) -> None:
        self._queue: asyncio.Queue[ASRResult] = asyncio.Queue()
        self._closed = False

    async def stream(self) -> AsyncIterator[ASRResult]:
        while True:
            item = await self._queue.get()
            if self._closed and not item.text:
                break
            yield item

    async def submit_audio(self, chunk: bytes) -> None:
        text = chunk.decode("utf-8", errors="ignore") or "Yes, please schedule the inspection."
        await self._queue.put(ASRResult(text=text, confidence=0.85, words=[]))

    async def close(self) -> None:
        self._closed = True
        await self._queue.put(ASRResult(text="", confidence=1.0, is_final=True))


class MockTTSProvider(BaseTTSProvider):
    async def synthesize(self, text: str) -> bytes:
        return f"mock-audio::{text}".encode("utf-8")


class MockLLMProvider(BaseLLMProvider):
    async def generate_reply(self, system_prompt: str, conversation: List[Dict[str, str]]) -> str:
        return "I'd love to schedule a free inspection. Does tomorrow afternoon work for you?"

    async def summarize(self, conversation: List[Dict[str, str]]) -> Dict[str, str]:
        return {
            "summary": "AI call completed. Homeowner agreed to schedule an inspection for tomorrow afternoon.",
            "next_steps": "Send confirmation email and assign estimator.",
            "sentiment": "positive",
        }


# ---------------------------------------------------------------------------
# Deepgram ASR implementation
# ---------------------------------------------------------------------------


class DeepgramStreamingASR(BaseASRProvider):
    def __init__(self, api_key: str, language: str = "en-US") -> None:
        self._api_key = api_key
        self._language = language
        self._queue: asyncio.Queue[ASRResult] = asyncio.Queue()
        self._socket = None

    async def _ensure_socket(self) -> None:
        if self._socket is not None:
            return
        try:
            from deepgram import (  # type: ignore
                DeepgramClient,
                DeepgramClientOptions,
                LiveSchema,
                LiveTranscriptionEvents,
            )
        except Exception as exc:  # pragma: no cover - environment dependent
            logger.warning("Deepgram SDK unavailable, falling back to mock ASR. %s", exc)
            raise

        client = DeepgramClient(self._api_key, DeepgramClientOptions(options={"keepalive": "true"}))
        socket = await client.listen.live.v("1")
        await socket.start(
            LiveSchema(
                model="nova-2",
                language=self._language,
                interim_results=False,
                smart_format=True,
                vad_turnoff=True,
            )
        )

        async def _handler(result, **kwargs):  # type: ignore
            channel = result.get("channel", {})
            alternatives = channel.get("alternatives", [])
            if not alternatives:
                return
            alt = alternatives[0]
            transcript = alt.get("transcript", "")
            if not transcript:
                return
            await self._queue.put(
                ASRResult(
                    text=transcript,
                    confidence=alt.get("confidence") or 0.85,
                    is_final=result.get("is_final", True),
                    words=alt.get("words"),
                )
            )

        socket.registerHandler(LiveTranscriptionEvents.Transcript, _handler)
        self._socket = socket

    async def stream(self) -> AsyncIterator[ASRResult]:
        await self._ensure_socket()
        while True:
            yield await self._queue.get()

    async def submit_audio(self, chunk: bytes) -> None:
        if self._socket is None:
            await self._ensure_socket()
        if self._socket is None:
            raise RuntimeError("Deepgram socket not initialised")
        await self._socket.send(chunk)

    async def close(self) -> None:
        if self._socket is not None:
            await self._socket.finish()
            self._socket = None


# ---------------------------------------------------------------------------
# ElevenLabs TTS
# ---------------------------------------------------------------------------


class ElevenLabsTTSProvider(BaseTTSProvider):
    def __init__(self, api_key: str, voice_id: str) -> None:
        self._client = httpx.AsyncClient(
            base_url=f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={"xi-api-key": api_key, "Accept": "audio/mpeg"},
            timeout=30.0,
        )

    async def synthesize(self, text: str) -> bytes:
        payload = {
            "text": text,
            "model_id": "eleven_monolingual_v1",
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.5},
        }
        response = await self._client.post("", json=payload)
        response.raise_for_status()
        return response.content


# ---------------------------------------------------------------------------
# LLM providers (OpenAI / Anthropic)
# ---------------------------------------------------------------------------


class OpenAILLMProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "gpt-4o-mini") -> None:
        from openai import AsyncOpenAI  # type: ignore

        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def generate_reply(self, system_prompt: str, conversation: List[Dict[str, str]]) -> str:
        messages = [{"role": "system", "content": system_prompt}] + conversation
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            temperature=0.25,
        )
        return response.choices[0].message.content or "Let me help with that."

    async def summarize(self, conversation: List[Dict[str, str]]) -> Dict[str, str]:
        prompt = (
            "You are summarizing a phone call between an AI sales agent and a homeowner. "
            "Return JSON with keys summary, next_steps, sentiment (positive|neutral|negative)."
        )
        transcript = "\n".join(f"{c['role']}: {c['content']}" for c in conversation)
        response = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": transcript},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        payload = response.choices[0].message.content or "{}"
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            return {"summary": payload, "next_steps": "", "sentiment": "neutral"}


class AnthropicLLMProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str = "claude-3-haiku-20240307") -> None:
        from anthropic import AsyncAnthropic  # type: ignore

        self._client = AsyncAnthropic(api_key=api_key)
        self._model = model

    async def generate_reply(self, system_prompt: str, conversation: List[Dict[str, str]]) -> str:
        prompt = [{"role": "system", "content": system_prompt}] + conversation
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=256,
            temperature=0.3,
            messages=[{"role": item["role"], "content": item["content"]} for item in prompt],
        )
        return response.content[0].text if response.content else "Let's schedule your inspection."

    async def summarize(self, conversation: List[Dict[str, str]]) -> Dict[str, str]:
        transcript = "\n".join(f"{c['role']}: {c['content']}" for c in conversation)
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=300,
            temperature=0,
            messages=[
                {
                    "role": "user",
                    "content": "Summarize the following call, returning JSON with summary, next_steps, sentiment:\n" + transcript,
                }
            ],
        )
        text = response.content[0].text if response.content else "{}"
        try:
            return json.loads(text)
        except Exception:
            return {"summary": text, "next_steps": "", "sentiment": "neutral"}


# ---------------------------------------------------------------------------
# Provider bundle factory
# ---------------------------------------------------------------------------


@dataclass
class VoiceProviderBundle:
    asr: BaseASRProvider
    tts: BaseTTSProvider
    llm: BaseLLMProvider


def build_provider_bundle(config) -> VoiceProviderBundle:
    """Return provider implementations based on configuration + credentials."""
    settings = get_settings()
    providers = settings.providers

    # LLM selection
    if config.llm_vendor == "anthropic" and providers.anthropic_api_key:
        llm: BaseLLMProvider = AnthropicLLMProvider(providers.anthropic_api_key)
    elif providers.openai_api_key:
        llm = OpenAILLMProvider(providers.openai_api_key)
    else:
        llm = MockLLMProvider()

    # ASR selection
    if config.asr_vendor == "deepgram" and providers.deepgram_api_key and not settings.feature_flags.use_mock_sequence_delivery:
        try:
            asr: BaseASRProvider = DeepgramStreamingASR(providers.deepgram_api_key)
        except Exception:  # pragma: no cover
            logger.warning("Falling back to mock ASR due to Deepgram init failure")
            asr = MockASRProvider()
    else:
        asr = MockASRProvider()

    # TTS selection
    if config.tts_vendor == "elevenlabs" and providers.elevenlabs_api_key and not settings.feature_flags.use_mock_sequence_delivery:
        tts: BaseTTSProvider = ElevenLabsTTSProvider(providers.elevenlabs_api_key, config.voice_id)
    else:
        tts = MockTTSProvider()

    return VoiceProviderBundle(asr=asr, tts=tts, llm=llm)
