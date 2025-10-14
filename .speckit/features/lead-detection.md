# Lead Detection & Roof Intelligence

**Version**: 4.0  
**Status**: ✅ Production core (pipeline live) · 🟡 Enhancements pending (Claude Vision feedback loop)  
**Last Updated**: 2025-10-14

Fish Mouth’s lead engine discovers aged roofs, enriches homeowner data, scores opportunity value, and feeds both the customer dashboard and outreach automations. This document reflects the live code in `/backend/services/lead_generation_service.py` and associated modules.

---

## Pipeline Overview

```
User Launches Scan (Dashboard)
  → LeadGenerationService.start_area_scan()
      → PropertyDiscoveryService.discover()
      → EnhancedRoofAnalysisPipeline.analyse()          # imagery + YOLOv8 anomalies
      → PropertyEnrichmentService.enrich()
      → ContactEnrichmentService.lookup()
      → LeadScoringEngine.score()
      → Persist Lead, Property, Scores, Activities
      → progress_notifier.publish() → /ws/scans/{scan_id}
```

Background execution uses Celery (`tasks/scan_tasks.py`) unless `use_inline_scan_runner` flag is enabled for development.

---

## Microservices & Ports (per claudeimplementation.md)

| Service | Port | Role | Status |
|---------|------|------|--------|
| Scraper | 8001 | Permit & market data ingestion | ⚙️ Ready for K8s rollout |
| Image Processor | 8002 | Imagery normalization, Real-ESRGAN | ✅ Used in pipeline |
| ML Inference | 8003 | YOLOv8 roof anomalies, segmentation | ⚙️ Partial – inference currently inline but port reserved |
| Enricher | 8004 | Contact lookup & validation | ✅ In production |
| Contractor Acquisition | 8005 | Prospect scoring (supply side) | ⚙️ Backlog |
| Outreach Orchestrator | 8007 | Sequences (SMS/email) & spend allocation | 🟡 In progress |

FastAPI monolith (port 8000) currently orchestrates all calls; services will be externalised as deployments mature.

---

## Frontend Experience

- `AreaScanner.jsx` – Users input area, radius, property cap; receive spend estimate (imagery, street-view, enrichment, processing costs).
- `ScanProgress.jsx` – Subscribes to `/ws/scans/{scan_id}` for status updates, qualified lead counts, failure reasons.
- `LeadIntelligenceTable.jsx` – Lists leads with sort/filter, anomaly badges, imagery readiness, quality flags.
- `EnhancedLeadDetailPage.jsx` – Displays AI insights, imagery tiles (base, normalized, heatmap, mask, street-views), anomalies, contact info, recommended actions.
- `DashboardLeadMap.jsx` & `ContagionHeatmap.jsx` – Visualize clusters & contagion spread.

---

## Scoring & Classification

`LeadScoringEngine` (see `lead_generation_service.py`) produces:

| Component | Weight | Notes |
|-----------|--------|-------|
| Condition | 0.42 | Derived from AI damage indicators & imagery quality |
| Roof Age | 0.25 | Age normalized against 30-year curve |
| Property Value | 0.15 | Tiered scoring by valuation |
| Damage Signals | 0.10 | Counts anomalies (hail, granule loss, etc.) |
| Contact Confidence | 0.08 | Quality of enriched contact data |

Output: score (0-100), priority label (`HOT`, `WARM`, `COLD`). Augmented data (contagion cluster stats, permits nearby, urgency tier) is persisted to `property_scores` & `contagion_clusters`.

---

## Data Model Highlights

- `AreaScan` – status, progress %, parameters, results summary, error message.
- `Lead` – property metadata, contact info (encrypted), AI analysis JSON, imagery URLs, local storage of anomalies.
- `PropertyScore`, `ContagionCluster`, `LeadActivity` – historical scoring, neighborhood intelligence, audit trail.
- `BuildingPermit`, `Property` – raw ingestion sources.

Refer to `.speckit/architecture/database-schema.md` for detailed table definitions.

---

## Cost Controls & Wallet Integration

- `leadAPI.estimateScan` calculates projected spend and warns when radius or property cap exceed safe limits.
- Wallet deductions: Each qualified lead debits wallet (via `BillingUsage`) at configured markup (wallet multiplier 4× API cost).
- Auto-spend toggles (SmartScan channel) determine whether scans run instantly or require manual confirmation; manual queue will surface in admin dashboard.
- Quest tasks leverage scan completions (e.g., “Launch a SmartScan today”) to award points.

---

## Upcoming Enhancements

1. **Claude Vision Reviewer** – integrate `claudeimplementation.md` workflow to re-score anomalies and provide narrative feedback.
2. **Batch Operations** – bulk status changes, CSV re-import, mass sequence enrollment.
3. **Outreach Defaults** – auto-enroll hot leads into outreach orchestrator with configurable distribution (35% SMS, 35% email, 30% voice).
4. **Quality Governance** – add human-in-the-loop validation queue for low-confidence imagery or enrichment failures.

---

## Developer Notes

- When adding new enrichment providers, update `services/providers/*` and adjust pipelines accordingly.
- Maintain `progress_notifier` compatibility—clients expect consistent payload structure over WebSocket.
- All new lead fields must be serialized via `LeadResponse` (see `backend/main.py`) to avoid breaking the SPA.
- Align any scoring tweaks with admin analytics and documentation (`CONFIGURATION_REFERENCE.md` for thresholds).

Keep this document synchronised with `claudeimplementation.md` whenever pipeline stages or scoring logic changes.




