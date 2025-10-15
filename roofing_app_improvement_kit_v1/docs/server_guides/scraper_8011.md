# Scraper (8011)
**Role:** Structured crawls for permits and assessor portals.

## Pipeline
- **Selector registry**: site-specific rules (CSS/XPath); overrideable at runtime.
- **Render**: headless browser (Playwright) with stealth; robots.txt checked; cache by URL + hash.
- **Extract**: schema mappers → normalized `PermitRecord`.
- **Output**: to Enrichment (8004).

## Minimal changes to repo
- Add `sources.yml` registry and honor it in scraper init.
- Implement per‑site throttle and a global token bucket.
