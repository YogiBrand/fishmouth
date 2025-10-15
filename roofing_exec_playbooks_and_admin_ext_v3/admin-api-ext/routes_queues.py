from fastapi import APIRouter, HTTPException
import httpx, os

router = APIRouter(tags=["queues"])

ORCH_URL = os.getenv("ORCH_URL", "http://localhost:8001")

@router.get("/queues/jobs")
async def jobs():
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{ORCH_URL}/jobs")
            r.raise_for_status()
            return r.json()
    except Exception as e:
        return {"error": str(e), "note": "Ensure Orchestrator exposes /jobs."}

@router.get("/queues/jobs/{job_id}")
async def job(job_id: str):
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{ORCH_URL}/jobs/{job_id}")
            r.raise_for_status()
            return r.json()
    except Exception as e:
        return {"error": str(e)}
