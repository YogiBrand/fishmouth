# Admin Portal Overview

**Goals**
- Single pane of glass for *business & technical* health.
- Style aligned with the roofer app (vertical nav; card grids; dark/light).
- Works with your existing Postgres or a separate `analytics` schema.

**Major pages**
1. **Overview** — MRR, ARPU, margin, DAU/WAU/MAU, conversion, top markets.
2. **Users** — plan, credits, spend, refunds; impersonate; force tier upgrade.
3. **Leads** — pipeline counts, win rates, campaign attribution, cluster heatmap.
4. **Usage** — API calls by service, LLM tokens, image jobs, queue depth, failure rates.
5. **Costs** — LLM $, imagery $, SMS/voice $, infra $, gross margin per lead.
6. **Revenue** — subscriptions, invoices, refunds.
7. **Messaging** — email/SMS/call outcomes; templates A/B; deliverability.
8. **Quality** — data coverage, image GSD, OCR rate, contact success; tier actions.
9. **Jobs/Queues** — orchestrator jobs, durations, error traces; retry/kill.
10. **Storm Events** — recent alerts, affected leads, follow‑up actions.
11. **System Health** — service status, CPU/mem, Postgres/Redis stats, rates/latency.

**Data model**
- **Event log** (append‑only): every user/API action emits `telemetry-gw` → Postgres `usage_events`.
- **Costs**: per event or batch (LLM token cost, SMS, tiles, etc.) into `cost_events`.
- **Revenue**: invoices/transactions/credits/refunds tables; reconciled nightly.
- **Materialized views**: rollups: `kpi_daily`, `api_usage_daily`, `costs_daily`, `margin_daily`.
