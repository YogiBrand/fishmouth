from fastapi import APIRouter, HTTPException
import os, httpx

router = APIRouter(tags=["scraper"])

SCRAPER_URL = os.getenv("SCRAPER_URL", "http://scraper-service:8011")

@router.post("/scraper/jobs")
async def create_scrape_job(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=60.0) as c:
            r = await c.post(f"{SCRAPER_URL}/jobs", json=payload)
        return r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.get("/scraper/jobs")
async def list_scrape_jobs(limit: int = 20, status: str | None = None):
    try:
        params = {"limit": limit}
        if status:
            params["status"] = status
        async with httpx.AsyncClient(timeout=20.0) as c:
            r = await c.get(f"{SCRAPER_URL}/jobs", params=params)
        return r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.get("/scraper/jobs/{job_id}")
async def get_scrape_job(job_id: str):
    try:
        async with httpx.AsyncClient(timeout=20.0) as c:
            r = await c.get(f"{SCRAPER_URL}/jobs/{job_id}")
        return r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


