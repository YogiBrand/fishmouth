# Codex Playbook — Multi Agent (parallel with gates)

**Agents**
- *Agent A (Data)*: Scraper 8011 + Enrichment 8004 + Mapping 8025
- *Agent B (Vision)*: Super‑HD 8015 + Image 8002 + Vision 8024
- *Agent C (AI & Quality)*: AI Gateway 8023 + Quality 8026 + Lead‑Gen 8008
- *Agent D (Frontend)*: Dashboard overlays + new panels
- *Agent E (Orchestration)*: Orchestrator 8001 + progress events

**Gates**
- G1: Mapping/Geocoding health passes.  
- G2: Vision returns `RoofAnalysis` fixture deterministically.  
- G3: Quality Engine emits a `QualityDecision` for the same fixture.  
- G4: Frontend renders polygons + badges.  
- G5: End‑to‑End workflow passes with sample address.

Run agents in parallel until G1, then G2→G3→G4. Finally run E2E to satisfy G5.
