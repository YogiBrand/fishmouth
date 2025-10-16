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

@router.post("/jobs/generate")
def generate_jobs(count: int = 5):
    now = datetime.utcnow().isoformat()
    for i in range(count):
        JOBS.append({
            "id": f"demo-{len(JOBS)+1}",
            "status": "running" if i % 2 == 0 else "queued",
            "percent": (i * 20) % 100,
            "queue": "lead-enrichment" if i % 2 == 0 else "vision",
            "updated_at": now,
            "created_at": now,
        })
    return {"generated": count, "total": len(JOBS)}
