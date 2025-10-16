from fastapi import APIRouter, HTTPException
import os, httpx

router = APIRouter(tags=["leads"])

ONBOARDING_URL = os.getenv("ONBOARDING_URL", "http://localhost:8034")

# Optional: simple orchestrator enqueue stub for enrollment (local dev gateway)
ORCH_ENQUEUE_URL = os.getenv("ORCH_ENQUEUE_URL", "")

@router.post("/leads/seed")
async def leads_seed(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(f"{ONBOARDING_URL}/onboarding/seed", json=payload)
        return r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


@router.post("/leads/redeem")
async def leads_redeem(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(f"{ONBOARDING_URL}/onboarding/redeem", json=payload)
        return r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.post("/leads/enroll")
async def leads_enroll(payload: dict):
    if not ORCH_ENQUEUE_URL:
        raise HTTPException(status_code=501, detail="Enrollment queue not configured")
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(ORCH_ENQUEUE_URL, json=payload)
        return r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.post("/leads/polygon/seed")
async def leads_seed_polygon(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=40) as c:
            r = await c.post(f"{ONBOARDING_URL}/onboarding/seed_polygon", json=payload)
        return r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.get("/leads/{user_id}")
async def leads_list(user_id: str):
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.get(f"{ONBOARDING_URL}/onboarding/leads/{user_id}")
        return r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))

@router.post("/leads/{lead_id}/scan")
async def leads_scan(lead_id: int, payload: dict):
    try:
        async with httpx.AsyncClient(timeout=180.0) as c:
            r = await c.post(f"{ONBOARDING_URL}/onboarding/leads/{lead_id}/scan", json=payload)
        return r.json()
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))


