# Sources Catalog (Template + Seed)

Use `scripts/registry_builder/build_portal_registry.py` to seed **Socrata** and **ArcGIS Hub** datasets.
Augment with curated sources per state (license boards, assessor portals, storm datasets).

## Structure
```json
[
  {"jurisdiction":"Austin, TX","type":"permits","source":"socrata","url":"...","updated":"2025-09-01"},
  {"jurisdiction":"Travis County, TX","type":"assessor","source":"arcgishub","url":"...","updated":"2025-08-15"}
]
```

## Seed examples
- **Permits (Socrata)**: chicago, seattle, san francisco, austin, nyc
- **Permits (ArcGIS Hub)**: los angeles county, maricopa county, miami-dade
- **Assessors**: county parcel viewers (ArcGIS FeatureServices)
- **License boards**: state contractor databases (often CSV or HTML tables)
- **Storms**: NWS alerts feed; NCEI Storm Events CSV
