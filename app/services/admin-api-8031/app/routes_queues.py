from fastapi import APIRouter, HTTPException
import httpx, os
from collections import Counter, defaultdict
from datetime import datetime

router = APIRouter(tags=["queues"])

ORCH_URL = os.getenv("ORCH_URL", "http://orchestrator_8001:8001")

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

        jobs_data = payload.get("jobs") if isinstance(payload, dict) else payload
        if not isinstance(jobs_data, list):
            jobs_data = []

        status_counter = Counter()
        queue_counter = Counter()
        avg_progress_tracker = defaultdict(list)
        latest_stamp = None
        latest_job = None
        oldest_stamp = None
        oldest_job = None

        for job in jobs_data:
            status = (job.get("status") or "unknown") if isinstance(job, dict) else "unknown"
            queue = (job.get("queue") or "default") if isinstance(job, dict) else "default"
            status_counter[status] += 1
            queue_counter[queue] += 1
            progress_val = (job.get("percent") if isinstance(job, dict) else None) or (job.get("progress") if isinstance(job, dict) else None)
            if isinstance(progress_val, (int, float)):
                avg_progress_tracker[queue].append(float(progress_val))

            updated_at = (job.get("updated_at") if isinstance(job, dict) else None) or (job.get("created_at") if isinstance(job, dict) else None)
            if updated_at:
                try:
                    stamp = datetime.fromisoformat(str(updated_at).replace("Z", "+00:00"))
                except Exception:
                    stamp = None
                if stamp is not None:
                    if latest_stamp is None or stamp > latest_stamp:
                        latest_stamp = stamp
                        latest_job = job
                    if oldest_stamp is None or stamp < oldest_stamp:
                        oldest_stamp = stamp
                        oldest_job = job

        latest_jobs.sort(key=lambda t: t[0], reverse=True)
        oldest_jobs.sort(key=lambda t: t[0])

        queue_health = []
        for queue, count in queue_counter.items():
            progresses = avg_progress_tracker.get(queue, [])
            avg_progress = sum(progresses) / len(progresses) if progresses else None
            queue_health.append({"queue": queue, "jobs": count, "avg_progress": avg_progress})

        return {
            "total_jobs": len(jobs_data),
            "statuses": [{"status": status, "count": count} for status, count in status_counter.most_common()],
            "queues": queue_health,
            "latest": latest_job,
            "oldest": oldest_job,
        }
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Unable to reach orchestrator: {exc}") from exc
    except Exception:
        # Defensive fallback to avoid 500s in Admin UI
        return {
            "total_jobs": 0,
            "statuses": [],
            "queues": [],
            "latest": None,
            "oldest": None,
        }
