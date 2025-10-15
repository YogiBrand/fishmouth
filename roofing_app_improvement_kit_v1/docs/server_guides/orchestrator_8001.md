# Orchestrator (8001)
**Role:** Coordinates multi‑step jobs and retries; publishes/consumes typed events.

## Endpoints
- `POST /orchestrate/roof-scan` → kicks off the workflow in `docs/workflows.md`.
- `GET /jobs/{id}` → status.

## Implementation Notes
- Use durable queues (Redis streams or RabbitMQ). 
- Emit `JobProgress` with step + % for frontend progress bar.
- Backoff/retry for external APIs; circuit‑breakers around Vision & Mapping services.
