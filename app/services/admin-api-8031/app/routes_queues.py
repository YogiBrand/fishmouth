from fastapi import APIRouter, HTTPException
import httpx, os
from collections import Counter, defaultdict
from datetime import datetime

router = APIRouter(tags=["queues"])

ORCH_URL = os.getenv("ORCH_URL", "http://orchestrator:8009")

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

@router.get("/queues/overview")
async def queue_overview():
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"{ORCH_URL}/jobs")
            r.raise_for_status()
            payload = r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Unable to reach orchestrator: {exc}") from exc

    jobs_data = payload.get("jobs") if isinstance(payload, dict) else payload
    if not isinstance(jobs_data, list):
        jobs_data = []

    status_counter = Counter()
    queue_counter = Counter()
    avg_progress_tracker = defaultdict(list)
    latest_jobs = []
    oldest_jobs = []

    for job in jobs_data:
        status = job.get("status", "unknown")
        queue = job.get("queue", "default")
        status_counter[status] += 1
        queue_counter[queue] += 1
        progress_val = job.get("percent") or job.get("progress")
        if isinstance(progress_val, (int, float)):
            avg_progress_tracker[queue].append(progress_val)

        updated_at = job.get("updated_at") or job.get("created_at")
        if updated_at:
            try:
                stamp = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            except Exception:
                continue
            latest_jobs.append((stamp, job))
            oldest_jobs.append((stamp, job))

    latest_jobs.sort(reverse=True)
    oldest_jobs.sort()

    queue_health = []
    for queue, count in queue_counter.items():
        progresses = avg_progress_tracker.get(queue, [])
        avg_progress = sum(progresses) / len(progresses) if progresses else None
        queue_health.append(
            {
                "queue": queue,
                "jobs": count,
                "avg_progress": avg_progress,
            }
        )

    return {
        "total_jobs": len(jobs_data),
        "statuses": [{"status": status, "count": count} for status, count in status_counter.most_common()],
        "queues": queue_health,
        "latest": latest_jobs[0][1] if latest_jobs else None,
        "oldest": oldest_jobs[0][1] if oldest_jobs else None,
    }
