# PRD‑03 · Messaging (Email & SMS)

**Goal:** SendGrid + Telnyx adapters, delivery webhooks, shortlinks (`/l/:code`).

## Data
- `outbox_messages`, `message_events`

## Acceptance
- Delivery/open/click/bounce tracked; shortlink click emits events.

## API Endpoints

- `POST /api/v1/outbox/send`
  - Queues an email or SMS message for delivery.
  - Request body (email example):

    ```json
    {
      "channel": "email",
      "to": "prospect@example.com",
      "subject": "Your roof report is ready",
      "html": "Hi {{shortlink}}",
      "text": "Hi {{shortlink}}",
      "attachments": [
        {
          "source": "report_pdf",
          "filename": "report.pdf",
          "type": "application/pdf"
        }
      ],
      "context": {
        "report_id": "REPORT-123",
        "lead_id": "LEAD-455",
        "share_url": "/r/abc123"
      }
    }
    ```

- Handler persists to `outbox_messages`, emits a `queued` event, and either executes inline (`use_inline_sequence_runner`) or dispatches `tasks.message_tasks.deliver`.

## Webhooks

- `POST /api/v1/webhooks/sendgrid`
  - Verifies [SendGrid Event Webhook](https://docs.sendgrid.com/for-developers/tracking-events/event#security)
    signatures via `SENDGRID_EVENT_PUBLIC_KEY`.
  - Maps `processed|delivered|open|click|bounce|dropped|spamreport` →
    `message_events` rows and updates `outbox_messages.status`.

- `POST /api/v1/webhooks/telnyx`
  - Validates Telnyx Ed25519/HMAC headers (`TELNYX_WEBHOOK_PUBLIC_KEY` or
    `TELNYX_WEBHOOK_SECRET`).
  - Handles `message.sent|message.delivered|message.delivery_failed|message.failed|message.bounced`.

### Sample cURL

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/sendgrid \
  -H "Content-Type: application/json" \
  -H "X-Twilio-Email-Event-Webhook-Signature: <sig>" \
  -H "X-Twilio-Email-Event-Webhook-Timestamp: <ts>" \
  -d '[{"event":"delivered","sg_message_id":"abc","email":"prospect@example.com","timestamp":1730000000,"custom_args":{"outbox_id":"<UUID>"}}]'
```

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/telnyx \
  -H "Content-Type: application/json" \
  -H "Telnyx-Timestamp: <ts>" \
  -H "Telnyx-Signature-Ed25519: <sig>" \
  -d '{"data":{"event_type":"message.delivered","payload":{"id":"msg_123","to":"+15551234567","metadata":{"message_id":"<UUID>"}}}}'
```

## Shortlinks

- `GET /l/{code}` resolves tracked links to the latest share URL,
  records `message.clicked`, and returns a `302` redirect.
- Messages can use the `{{shortlink}}` token; the outbox service swaps it
  for a tracked URL and stores metadata in `outbox_messages.payload.shortlinks`.
