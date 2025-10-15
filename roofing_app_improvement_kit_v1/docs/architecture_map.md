# Architecture Map (Local‑first)

```
[Frontend 3000]  ->  [Backend API 8000]
                          |
                          +--> [Orchestrator 8001] ----+
                          |                            |
                          |                            +--> [Image Processor 8002]
                          |                            +--> [ML Inference 8003]
                          |                            +--> [Enrichment 8004]
                          |                            +--> [Lead‑Gen 8008]
                          |                            +--> [Scraper 8011]
                          |                            +--> [Super‑HD Demo 8015] (optional)
                          |                            +--> [AI Gateway 8023] (NEW)
                          |                            +--> [Vision AI 8024] (NEW)
                          |                            +--> [Mapping Intel 8025] (NEW)
                          |                            +--> [Quality Engine 8026] (NEW)
                          |                            +--> [OSINT Contacts 8027] (NEW)
                          |                            +--> [Event Monitor 8028] (NEW)
                          |
                      [Postgres + PostGIS]  [Redis]  [Blob storage]
```

- **Existing**: Backend (8000), Orchestrator (8001), Image (8002), ML (8003), Enrichment (8004),
  Lead‑Gen (8008), Scraper (8011), Super‑HD Demo (8015), Frontend (3000).
- **New**: 8023–8028 services that give you free‑tier functionality and precise upgrade hooks.

Each service publishes a **typed event** and/or **REST contract**; schemas in `docs/workflows.md`.
