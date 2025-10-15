from fastapi import APIRouter
from typing import Any, Dict

router = APIRouter(prefix="/api/v1", tags=["config"])

APP_CONFIG: Dict[str, Any] = {
    "kpis": ["hot_leads","warm_leads","reports_sent","report_views","replies","appointments"],
    "leadTable": {"columns": ["address","owner","verified_contacts","roof_age","priority","confidence","reasons","last_activity","next_step"]},
    "features": {"serverSidePdf": True,"shareLinks": True,"sequencesV1": True,"overlayToggle": True},
}

@router.get("/app-config")
def app_config():
    return APP_CONFIG
