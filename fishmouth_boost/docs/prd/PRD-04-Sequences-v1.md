# PRD‑04 · Sequences v1 (Event-driven)

**Goal**: Minimal engine to execute `wait`, `email`, `sms`, and `condition` steps and react to `report.viewed` / `message.clicked`.

**API**
- `POST /api/v1/sequences/{id}/enroll {lead_id}`
- `POST /api/v1/sequences/{id}/pause {lead_id}`
- `GET /api/v1/enrollments/{id}`

**Data**
- `sequences(id, name, workflow_definition jsonb, active)`
- `sequence_enrollments(id, sequence_id, lead_id, current_step, status, next_run_at)`
- `sequence_history(id, enrollment_id, step_index, event, at, meta)`

**Acceptance**
- Sample flow: wait 1h → email → wait 1d → sms; trigger via `report.sent` or `report.viewed`.
