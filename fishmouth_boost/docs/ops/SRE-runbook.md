# SRE Runbook (Golden Signals)

**Backend**: requests/sec, p95 latency per route (<200ms), 4xx/5xx by route, DB time vs total.
**Renderer**: jobs queued/running/succeeded/failed, p95 render time, memory use.
**Messaging**: sent/delivered/opened/clicked/bounced per hour; provider error codes.
**Scraper**: pages fetched/min, parse success rate, retry buckets.
**Image Processor**: per-stage latency, OOM count, overlay generation rate.
**Voice**: ASR latency, TTS latency, outcomes by disposition.
