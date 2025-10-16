#!/usr/bin/env bash
set -euo pipefail
echo "[1/9] Health checks"
curl -sf http://localhost:8000/health || true
curl -sf http://localhost:8031/health || true
curl -sf http://localhost:8030/health || true

echo "[2/9] Admin metrics"
curl -s http://localhost:8031/kpi/daily || true
curl -s http://localhost:8031/usage/summary?days=7 || true
curl -s http://localhost:8031/costs/summary?days=7 || true

echo "[3/9] Admin health/services"
curl -s http://localhost:8031/health/services || true

echo "[4/9] Create manual lead"
curl -s -X POST http://localhost:8000/api/leads/manual -H 'Content-Type: application/json' -d '{"address":"123 Main St, Austin, TX","include_street":false}' || true

echo "[5/9] Enhanced report draft (fallback ok)"
curl -s -X POST http://localhost:8000/api/reports/enhanced -H 'Content-Type: application/json' -d '{"lead_id":"demo"}' || true

echo "[6/9] Admin providers list"
curl -s http://localhost:8031/messaging/providers || true

echo "[7/9] Telemetry sanity (no error)"
curl -s http://localhost:8030/health || true

echo "[8/9] Leads seed/list (requires USER_ID env)"
if [[ -n "${USER_ID:-}" ]]; then
  curl -s -X POST http://localhost:8031/leads/seed -H 'Content-Type: application/json' -d '{"user_id":"'"${USER_ID}"'","lat":29.7604,"lon":-95.3698,"radius_m":5000,"sample":200}' || true
  curl -s http://localhost:8031/leads/${USER_ID} || true
fi

echo "[9/9] Tiles metadata"
curl -s http://localhost:8080/data/roofing_markets.json || true
echo "OK"
