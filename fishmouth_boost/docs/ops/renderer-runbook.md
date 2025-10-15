# Renderer Runbook

**Symptoms:** PDF/PNG not rendering, timeouts, or high memory.

**Checks**
1. Health: `/healthz` returns 200.
2. Queue depth: rendering queue not backing up (>100 jobs).
3. Logs: look for `renderer.render_pdf` entries with error codes.

**Actions**
- Reduce concurrency via `RENDER_MAX_CONCURRENCY`.
- Switch to WeasyPrint if Playwright is unstable (and vice versa).
- Confirm write permissions to `static/uploads`.
- Clear stale tokens in `public_shares` if viewer 404s.

**Metrics**
- p95 render time (<3s), error rate (<1%), PDF size distribution.
