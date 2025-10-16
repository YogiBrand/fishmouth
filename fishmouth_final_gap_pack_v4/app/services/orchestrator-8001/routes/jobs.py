from fastapi import APIRouter
from typing import List, Dict
from datetime import datetime

router = APIRouter()

# naive in-memory job list (replace with Redis/DB)
JOBS: List[Dict] = []

@router.get("/jobs")
def list_jobs():
    return {"jobs": JOBS}

@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    for j in JOBS:
        if j.get("id")==job_id:
            return j
    return {"error":"not_found"}

def record_job(job_id: str, status: str, percent: int):
    JOBS.append({
        "id": job_id, "status": status, "percent": percent,
        "updated_at": datetime.utcnow().isoformat()
    })
