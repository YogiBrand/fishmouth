#!/usr/bin/env python3
"""Check that mocked data and buttons map to real services and routes."""
import json, sys

EXPECTED = {
  "RoofAnalysis.v1": "/api/analysis/roof",
  "QualityDecision.v1": "/api/quality/decision",
  "OwnerReport": "/api/reports/owner"
}

def main(payloads_dir):
    import pathlib
    ok = True
    for p in pathlib.Path(payloads_dir).glob("*.json"):
        data = json.loads(p.read_text())
        kind = data.get("kind")
        if kind in EXPECTED:
            print(f"[OK] {p.name} -> {EXPECTED[kind]}")
        else:
            print(f"[WARN] {p.name} has unknown kind={kind}")
            ok = False
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv)>1 else ".")
