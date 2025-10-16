# Data Sources & Scraping Catalog (Free-first)

## Government & Open Data
- **Socrata Discovery**: thousands of municipal open-data portals. Use `scripts/registry/discover_socrata.py "permits"`.
- **ArcGIS Hub**: similar discovery for ArcGIS-backed portals. Use `scripts/registry/discover_arcgis_hub.py "permits"`.
- **NWS / NOAA**: real-time alerts and storm events; correlate with high-value markets.
- **USGS/NAIP**: aerial imagery (public domain) suitable for analytics; serve with TiTiler as COGs.

## Contact/Business OSINT (free-first)
- Mapillary, OSM Overpass, public registries, chamber listings; add paid tiers only on quality triggers.

## Tips
- Cache portal lists to avoid rate limits.
- Respect robots.txt and portal usage policies.
- Emit telemetry cost events for any paid calls.
