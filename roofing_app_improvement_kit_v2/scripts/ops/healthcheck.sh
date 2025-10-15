#!/usr/bin/env bash
set -euo pipefail
ports=(3000 8000 8001 8002 8003 8004 8008 8011 8015 8023 8024 8025 8026 8027 8028 8080 8081 8082)
for p in "${ports[@]}"; do
  if curl -s "http://localhost:${p}/health" | grep -q '"status"'; then
    echo "[OK] ${p}"
  else
    echo "[?] ${p} health endpoint not found; trying root…"
    curl -s -o /dev/null -w "HTTP %{http_code}\n" "http://localhost:${p}/" || true
  fi
done
