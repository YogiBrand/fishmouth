# PRD‑03 · Outbound Messaging (Email & SMS) + Webhooks + Shortlinks

**Goal**: Reliable SendGrid email and Telnyx SMS with receipts, shortlink tracking, and safe fallbacks.

**API**
- `POST /api/v1/outbox/send` — queue send; returns message id
- `GET /api/v1/outbox/{id}` — status
- `POST /webhooks/sendgrid` / `POST /webhooks/telnyx` — delivery, open, click, bounce
- `GET /l/{code}` — shortlink redirect (emits `message.clicked`)

**Data**
- `outbox_messages(id, channel, payload, status, provider, provider_id, error, created_at, sent_at)`
- `message_events(id, message_id fk, type, meta, at)`

**Acceptance**
- Transient errors retry (x3, backoff).
- Webhooks validated by signature, idempotent insert.
- Clicks linked via shortlinks to report shares.
