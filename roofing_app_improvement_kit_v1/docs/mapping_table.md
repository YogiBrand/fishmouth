# Mapping Table: Data → Dashboard

| Event/Entity            | Backend Route                        | DB Table / Collection     | Frontend Widget / Page           |
|-------------------------|--------------------------------------|---------------------------|----------------------------------|
| `RoofAnalysis.v1`       | `POST /api/analysis/roof`            | `roof_analyses`           | Lead detail → Roof panel         |
| `QualityDecision.v1`    | `POST /api/quality/decision`         | `quality_decisions`       | Lead list badge + detail card    |
| `PropertyEnrichment`    | `POST /api/enrichment/property`      | `property_enrichments`    | Property panel → Enrichment tab  |
| `StormEvent`            | `POST /api/events/storm`             | `storm_events`            | Storm banner + queue             |
| `Lead`                  | `POST /api/leads`                    | `leads`                   | Leads table + map markers        |
| AI Report (owner)       | `POST /api/reports/owner`            | `reports`                 | Report viewer + export PDF       |
| Outreach draft          | `POST /api/outreach/draft`           | `outreach_messages`       | Outreach composer                |
