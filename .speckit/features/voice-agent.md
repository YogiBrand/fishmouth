# AI Voice Agent Feature Spec

**Version**: 4.0  
**Status**: ✅ Campaign launch / analytics live & ⏳ Streaming pipeline in progress  
**Last Updated**: 2025-10-14

The AI Voice Agent automates outbound calls to qualified roofing leads. It currently supports asynchronous campaign launch and post-call analytics with Telnyx Call Control; real-time streaming (Deepgram ↔ Claude ↔ ElevenLabs) is under active development.

---

## System Overview

| Layer | File(s) | Responsibilities |
|-------|---------|------------------|
| API | `backend/app/api/v1/ai_voice.py` | Campaign launch, follow-up scheduling |
| Service | `backend/app/services/ai_voice_agent.py` | Telnyx & Vapi.ai orchestration, call script generation, ledger updates |
| Legacy Service | `backend/services/voice_agent_service.py` | Streaming playground & metrics helpers (to be unified post-streaming) |
| Models | `backend/models.py` (`VoiceCall`, `CallCampaign`, `VoiceCallTurn`, `VoiceBooking`, `VoiceConfiguration`, `VoiceMetricsDaily`) | Persistence layer |
| Webhooks | `backend/app/api/v1/webhooks.py`, `backend/main.py` (`verify_telnyx_signature`) | Telnyx event intake (Ed25519 + HMAC fallback) |
| Frontend | `frontend/src/components/VoiceCallManager.jsx`, `VoiceTranscriptModal.jsx` | UI for history, analytics, transcripts |
| Activity Feed | `app/services/activity_stream.py` | Publishes `ai_campaign_launched`, `voice_call_completed` events to `/ws/activity` |

---

## Current Capabilities

1. **Campaign Launch**
   - Endpoint: `POST /api/v1/ai-voice/campaign`
   - Inputs: `lead_ids`, `contractor_id`, optional `campaign_name`
   - Flow: Fetch contractor + lead enrichment → generate call script via Claude 3.5 Sonnet → create Vapi.ai call sessions → persist `CallCampaign` + `VoiceCall` records → emit activity event.

2. **Follow-up Orchestration**
   - Endpoint: `POST /api/v1/ai-voice/follow-up`
   - Queues sequence tasks (`no_answer`, etc.) via `AIVoiceAgentService.send_followup_sequence`.

3. **Call Script Generation**
   - Templates stored in `backend/app/services/templates/voice_script_prompt.txt` (fallback prompt builder inline).
   - Claude receives enriched lead data (roof intelligence, contagion metrics, contractor profile) to craft JSON instructions for Vapi.ai.

4. **Cost & Wallet Integration**
   - Estimated cost returned (`len(calls) * 0.35`) and logged in `BillingUsage`.
   - Wallet auto-spend rules respected (manual confirmation flow pending API wiring).
   - Activity feed triggers to inform dashboard wallet widgets.

5. **Analytics & History**
   - `VoiceMetricsDaily` aggregates conversions, connect rate, bookings.
   - `frontend/src/components/VoiceCallManager.jsx` lists calls with filters, renders analytics charts (Recharts), opens transcript modal.

---

## Streaming Roadmap (⏳)

| Component | Status | Notes |
|-----------|--------|-------|
| Telnyx Stream Bridge (`services/voice/streaming.py`) | Scaffolded | Accepts `/api/voice/stream/{call_id}` connections |
| Deepgram ASR | Integrating | Chunked transcription with partial hypothesis support |
| Claude Conversational Loop | Pending | Will use streaming API for real-time intent handling & state machine |
| ElevenLabs TTS | Pending | Low-latency audio response, handles barge-in |
| Frontend Waveform & Live Transcript | Planned | Dashboard will display live waveform + real-time transcript once loop is live |

Manual confirmations will currently debit wallet post-call using fallback ledger entries. When streaming launches, per-minute billing will switch to live debits with pause/resume support.

---

## Data Flow

```
Lead selection → POST /api/v1/ai-voice/campaign
  → AIVoiceAgentService.create_call_campaign()
      → Fetch enriched lead data (properties + contagious cluster stats)
      → Generate script with Claude
      → Create Vapi.ai call session (stores call IDs)
      → Save VoiceCall + CallCampaign + ledger usage
      → publish("ai_campaign_launched")
  → Frontend updates campaign list + wallet

Telnyx Webhook events (answer, hangup, recording) → /api/webhooks/telnyx
  → Signature validated (Ed25519 preferred)
  → Voice call status/metrics updated
  → Activity feed receives `voice_call_completed`
```

Once streaming is live, media streams will be proxied through `/api/voice/stream/{call_id}` with Deepgram/Claude/ElevenLabs in the loop.

---

## Configuration

Required env variables (see CONFIGURATION_REFERENCE):

```
TELNYX_API_KEY
TELNYX_FROM_NUMBER
TELNYX_CONNECTION_ID
TELNYX_MESSAGING_PROFILE_ID
TELNYX_WEBHOOK_PUBLIC_KEY or TELNYX_WEBHOOK_SECRET
VAPI_API_KEY
ANTHROPIC_API_KEY
DEEPGRAM_API_KEY (streaming)
ELEVENLABS_API_KEY (streaming)
```

Per-user voice settings stored in `VoiceConfiguration` (ASR vendor, TTS voice, max duration, barge-in, silence timeout). Defaults auto-provisioned in `build_voice_call_config`.

---

## Frontend Experience

`VoiceCallManager.jsx` provides:
- Filters: status, outcome, interest level, search.
- Analytics: 21-day call volume, bookings, connect rates.
- Transcript Modal: loads via `voiceAPI.getCall(call.id)` and displays conversation summary, next steps, call outcomes.
- Quick Actions: Call back, send email, open workspace.
- Future: Live waveform + streaming transcript once backend pipeline lands.

---

## Outstanding Tasks (Mirrors CURRENT_STATUS)

1. **Streaming Loop Completion** – Finalise Deepgram/Claude/ElevenLabs pipeline and persist live turns to `VoiceCallTurn`.
2. **Wallet Manual Confirmation** – When auto-spend disabled, queue approvals; expose admin queue UI.
3. **Stripe Minutes Bundles** – Offer prepaid voice minutes via wallet modal; reflect in admin telemetry.
4. **Latency Metrics** – Capture ASR/LLM/TTS latencies for Prometheus dashboards.

---

## Testing Notes

- `tests/services/test_voice_agent_service.py` covers campaign creation & follow-up sequencing (ensure migrations up-to-date).
- Use Telnyx test webhooks to verify signature validation.
- Mock Claude responses when running offline (`ANTHROPIC_API_KEY` optional).
- Voice streaming tests live in `ai-voice-server/` playground until merged.

Keep this document in sync with `claudeimplementation.md` when new providers or streaming features go live.




