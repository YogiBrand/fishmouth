# PRD‑23 · Analytics & Materialized Views

- `mv_funnel_daily` with sent/viewed/clicked/appointment.
- Optional `mv_quality_cost_daily` joining api_cost_log for KPI on cost/lead.
- Refresh nightly; provide `/api/v1/dashboard/summary` consuming these MVs.
