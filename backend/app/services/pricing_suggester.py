"""Pricing suggester service.

Generates min/max price suggestions per service for a given state using
simple heuristics and optional web research hooks (placeholder).

This can later call the scraper-service to collect sources and compute
min/median/max per service and state.
"""

from __future__ import annotations

from typing import Any, Dict, List


BASELINES = {
    # Baseline USD ranges by service, to be scaled by state cost index
    "roof_replacement": (8000, 25000),
    "storm_damage_repair": (1500, 6500),
    "gutter_installation": (900, 2800),
    "roof_inspection": (75, 350),
    "leak_repair": (250, 1200),
}

STATE_COST_INDEX = {
    # Very rough multipliers; replace with real CPI/regional index later
    "CA": 1.25,
    "NY": 1.20,
    "MA": 1.18,
    "WA": 1.15,
    "CO": 1.10,
    "TX": 1.00,
    "FL": 1.02,
    "AZ": 0.98,
    "GA": 0.96,
    "OH": 0.94,
}


def normalize_service_key(name: str) -> str:
    n = (name or "").strip().lower()
    if "replace" in n:
        return "roof_replacement"
    if "storm" in n or "hail" in n:
        return "storm_damage_repair"
    if "gutter" in n:
        return "gutter_installation"
    if "inspect" in n:
        return "roof_inspection"
    if "leak" in n:
        return "leak_repair"
    return "roof_replacement"


def suggest_price_ranges(state: str, services: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Return suggestions keyed by service id/name.

    Each entry: { suggested_min, suggested_max, unit, sources: [] }
    """
    multiplier = STATE_COST_INDEX.get((state or '').upper(), 1.0)
    suggestions: Dict[str, Dict[str, Any]] = {}
    for service in services or []:
        key = normalize_service_key(service.get("name") or service.get("id") or "")
        base_min, base_max = BASELINES.get(key, (2000, 12000))
        smin = round(base_min * multiplier)
        smax = round(base_max * multiplier)
        sid = str(service.get("id") or service.get("name") or key)
        suggestions[sid] = {
            "suggested_min": smin,
            "suggested_max": smax,
            "unit": service.get("unit") or "project",
            "sources": [
                {
                    "label": "industry_estimate_v1",
                    "url": None,
                    "method": "heuristic",
                }
            ],
        }
    return suggestions



