# Renderer Runbook
1) Check Celery queue `rendering` depth and worker logs.
2) Ensure /static/uploads has space and permissions.
3) Restart worker with drain if memory creep observed.
4) Verify HTML snapshot and checksum calculation.
