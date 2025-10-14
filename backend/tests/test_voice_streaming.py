import asyncio

import pytest

from models import Lead, LeadPriority, LeadStatus, User, VoiceCall
from services.voice.providers import MockASRProvider, MockLLMProvider, MockTTSProvider, VoiceProviderBundle
from services.voice.streaming import InMemoryTelnyxStream, VoiceStreamingOrchestrator


@pytest.mark.asyncio
async def test_voice_streaming_orchestrator_generates_turns():
    user = User(id=1, email="test@example.com", hashed_password="pw")
    lead = Lead(
        id=1,
        user_id=1,
        address="123 Main St",
        city="Austin",
        state="TX",
        homeowner_name="Jordan",
        priority=LeadPriority.HOT,
        status=LeadStatus.NEW,
    )
    call = VoiceCall(id="call-1", call_control_id="cc-1", user_id=1, lead_id=1)

    bundle = VoiceProviderBundle(asr=MockASRProvider(), tts=MockTTSProvider(), llm=MockLLMProvider())
    stream = InMemoryTelnyxStream("cc-1")

    async def stream_factory(_: VoiceCall):
        return stream

    orchestrator = VoiceStreamingOrchestrator(
        providers=bundle,
        call=call,
        lead=lead,
        user=user,
        stream_factory=stream_factory,
        system_prompt="Test prompt",
        max_turns=3,
    )

    async def feed_audio():
        await stream.push_audio(b"hello there")
        await asyncio.sleep(0.05)
        await stream.close()

    feeder = asyncio.create_task(feed_audio())
    result = await orchestrator.run()
    await feeder

    assert any(turn.role == "assistant" for turn in result.turns)
    assert any(turn.role == "user" for turn in result.turns)
    assert result.summary
    assert stream.sent_audio, "Expected synthesized audio to be written back to stream"
    assert result.first_audio_latency_ms is not None
