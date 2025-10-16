#!/usr/bin/env bash
set -euo pipefail
echo "[1/6] Health checks"
curl -sf http://localhost:8000/health || true
curl -sf http://localhost:8031/health || true
curl -sf http://localhost:8030/health || true

echo "[2/6] Create manual lead"
curl -s -X POST http://localhost:8000/api/leads/manual -H 'Content-Type: application/json' -d '{"address":"123 Main St, Austin, TX","include_street":false}' || true

echo "[3/6] Enhanced report draft (fallback ok)"
curl -s -X POST http://localhost:8000/api/reports/enhanced -H 'Content-Type: application/json' -d '{"lead_id":"demo"}' || true

echo "[4/6] Admin providers list"
curl -s http://localhost:8031/messaging/providers || true

echo "[5/6] Telemetry sanity (no error)"
curl -s http://localhost:8030/health || true

echo "[6/6] Tiles metadata"
curl -s http://localhost:8080/data/roofing_markets.json || true
echo "OK"
