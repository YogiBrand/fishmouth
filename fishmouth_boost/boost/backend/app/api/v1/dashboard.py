from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/api/v1", tags=["dashboard"])

# Demo-only summary; in production, compute from events/message_events
@router.get("/dashboard/summary")
def dashboard_summary():
    return {
        "kpis": {
            "hot_leads": 12,
            "warm_leads": 34,
            "reports_sent": 5,
            "report_views": 8,
            "replies": 3,
            "appointments": 1
        },
        "funnel": {"sent": 5, "viewed": 8, "replied": 3, "booked": 1, "median_step_times": {"sent_to_viewed": "2h"}},
        "usage": {"period": "7d", "leads_qualified": 46, "credits_balance": 120},
        "errors_24h": 0
    }

@router.get("/activity")
def activity():
    items: List[Dict[str, Any]] = [
        {"at": datetime.utcnow().isoformat() + "Z", "type": "report.sent", "report_id": "rpt_123", "lead_id": "lead_1"},
        {"at": datetime.utcnow().isoformat() + "Z", "type": "report.viewed", "report_id": "rpt_123", "lead_id": "lead_1"},
    ]
    return {"items": items}
