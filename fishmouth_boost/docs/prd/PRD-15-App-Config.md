# PRD‑15 · App Config (Server‑driven UI)

`GET /api/v1/app-config` returns:
```json
{
  "kpis": ["hot_leads","warm_leads","reports_sent","report_views","replies","appointments"],
  "leadTable": {"columns": ["address","owner","verified_contacts","roof_age","priority","confidence","reasons","last_activity","next_step"]},
  "features": {"serverSidePdf": true,"shareLinks": true,"sequencesV1": true,"overlayToggle": true}
}
```
Front-end fetches at boot and revalidates every 10 minutes.
