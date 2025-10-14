# Playbook 3 – Autonomous Sequences (Implementation Plan)

## Objectives
1. Move sequence processing off the API thread and into Celery workers with persistent scheduling windows.
2. Introduce delivery adapters for Email (SendGrid/Postmark), SMS (Telnyx Messaging), and Voice (Telnyx Call Control) that honour live/mock feature flags.
3. Track branching outcomes and allow manual operator overrides from the dashboard.
4. Present a consolidated lead timeline showing automated + manual touchpoints.

## Architecture Blueprint
- **Scheduler**: replace inline `asyncio.sleep` calls with a scheduling layer that stores `next_execution_at` and enqueues discrete Celery jobs per node execution (`sequence.execute_node`).
- **Adapters**: create interfaces `EmailDeliveryAdapter`, `SmsDeliveryAdapter`, `VoiceDeliveryAdapter` with live + mock implementations; adapters emit structured results for telemetry.
- **Telemetry**: persist step execution logs with status, payload, and adapter metadata for downstream analytics.
- **API Extensions**:
  - Endpoints to pause/resume/cancel enrollments (`PUT /api/sequences/enrollments/{id}`).
  - Endpoint to record manual contact outcomes to unblock conditional nodes.
- **Frontend**: augment `LeadDetailPage` timeline and sequence management controls (pause, skip, mark converted).

## Work Breakdown
1. **Backend foundations**
   - [ ] Introduce `sequence_scheduler.py` with Celery-friendly enqueue helpers.
   - [ ] Add `sequence_executions` table for step logs (`status`, `started_at`, `completed_at`, `adapter`, `metadata`).
   - [ ] Replace inline `asyncio.sleep` mocks with adapter calls + job requeue.
2. **Delivery adapters**
   - [ ] Email adapter supporting SendGrid/Postmark; reuse AI copywriter when `use_ai_writer` is true.
   - [ ] SMS adapter with Telnyx live + mock fallbacks and inbound webhook stub.
   - [ ] Voice adapter to hand off to the Playbook 4 voice orchestrator (stub -> Celery job).
3. **Control plane**
   - [ ] API handlers for manual overrides and enrollment status changes.
   - [ ] Dashboard components for pause/resume + timeline feed integration.
4. **Testing & Observability**
   - [ ] Unit tests for adapter mocks (no network).
   - [ ] Celery integration tests covering scheduling edge cases.
   - [ ] Metrics counters (success/failure per adapter) and tracing spans around sequence executions.

## Dependencies & Risks
- Telnyx + SendGrid credentials for live mode; ensure feature flags default to mocks.
- Celery queue volume increases — update worker autoscaling + monitoring.
- Timeline UI depends on Playbook 5 analytics for richer insights.

## Immediate Next Steps
- Implement the `sequence_executions` table and logging model.
- Refactor `SequenceExecutor` to enqueue discrete jobs rather than sleeping inline.
- Stub email/SMS adapters with mock implementations to unblock UI integration while awaiting provider credentials.
