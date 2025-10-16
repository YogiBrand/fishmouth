# Codex — FINAL Multi‑Agent Plan (7 agents with gates)

Repo base: /home/yogi/fishmouth

Agents
A — Maps & Data: tileserver_gl (8080), titiler (8081), markets MBTiles refresh
B — Vision: image-*, vision-8024, confirm deterministic RoofAnalysis on fixtures
C — AI & Quality: ai-gateway-8023 (budgets), quality-8026, leadgen-8008
D — Orchestration: orchestrator-8001, address-8022 flow (+ /jobs)
E — Frontend: Dashboard map env + Address Lookup progressive UI
F — Admin & Telemetry: telemetry-8030, admin-api-8031, admin-ui build
G — Messaging & Billing: SMTP send, domain verify, (optional) billing-gw-8032

Gates
G1: A proves 8080/8081 up; dashboard loads satellite via REACT_APP_SATELLITE_TILE_TEMPLATE
G2: B returns stable RoofAnalysis JSON for a test image
G3: C enforces RPM/tokens/day budgets; emits cost events
G4: D shows address lookup progressive statuses → new lead exists
G5: F shows usage events in Grafana; Admin Users & KPI load
G6: G sends SMTP test; domain verify returns SPF+DMARC; Queues shows jobs
G7: End-to-end: lead → enhanced report → outreach email; margin_daily updated

Work orders per agent are in repo docs + v4 gap pack. Work in parallel; respect gates.
