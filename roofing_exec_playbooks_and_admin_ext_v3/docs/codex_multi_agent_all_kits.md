# Codex Playbook — **Multi‑Agent** (Parallel) with Gates

**Agents & Scopes**
- **Agent A — Data & Maps:** mapping-8025, scraper-8011, tiles stack (8080/8081/8082)
- **Agent B — Vision:** image-8002, vision-8024, CV models, overlays
- **Agent C — AI & Quality:** ai-gateway-8023 (quota/budget), quality-8026, leadgen-8008
- **Agent D — Orchestration:** orchestrator-8001, address-8022 flow, progress events
- **Agent E — Frontend:** dashboard overlays, Address Lookup progressive UI
- **Agent F — Admin & Telemetry:** telemetry-8030, admin-api-8031, admin-ui
- **Agent G — Messaging & Billing:** providers, domain connect, DMARC/SPF/DKIM checks; billing-gw-8032

**Gates (must pass in order)**
- **G1:** Mapping 8025 /geocode, TileServer (8080), TiTiler (8081) health — pass.
- **G2:** Vision 8024 returns deterministic `RoofAnalysis` for a fixture — pass.
- **G3:** Quality 8026 emits `QualityDecision` for the fixture — pass.
- **G4:** Address Lookup returns progressive data (geocode→imagery→analysis) — pass.
- **G5:** Telemetry events captured in analytics DB; Grafana shows rates — pass.
- **G6:** Admin Messaging verifies domain (SPF & DMARC present), sends test email — pass.
- **G7:** End‑to‑end lead created; outreach email queued; costs recorded; margin reflects — pass.

**Parallelization**
- A/B can start immediately.
- C waits for B to pass minimal fixture (G2).
- D/E can work in parallel after A passes (G1).
- F can proceed after telemetry endpoints are reachable (any time after services boot).
- G after F (needs Admin API), but domain checks can start earlier.

**Handoffs**
- A → D: normalized geocode + tile URIs
- B → C: RoofAnalysis payload
- C → E: QualityDecision + report prompt
- F → G: provider status & domain check results
