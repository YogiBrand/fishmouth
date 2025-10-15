# Integration Test Plan (Smoke)

## Stage 1 — Reporting
- POST /api/v1/reports/demo/render with simple HTML → returns pdf_url, preview_url, checksum
- POST /api/v1/reports/demo/share → returns share_url and token
- GET {base}/r/{token} → 200 and logs `report.viewed`

## Stage 2 — Templates/Tokens
- PUT /api/v1/templates/welcome-email with tokens
- POST /api/v1/templates/preview → returns resolved html and any unresolved tokens

## Stage 3 — Messaging
- POST /api/v1/outbox/send {channel: sms, to: +1..., text: "Hi"} → id + status (dry_run by default)
- GET /api/v1/outbox/{id} → returns status

## Stage 4 — Sequences
- PUT /api/v1/sequences/seq1 with a simple 2-step workflow
- POST /api/v1/sequences/seq1/enroll {lead_id} → enrollment id
- POST /api/v1/enrollments/{id}/step → advances

## Stage 7 — Dashboard
- GET /api/v1/dashboard/summary → KPI/funnel json
- GET /api/v1/activity → list of events
