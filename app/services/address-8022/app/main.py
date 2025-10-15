from fastapi import FastAPI, Request
from pydantic import BaseModel
import uuid
import os, time, asyncio
import httpx

app = FastAPI(title="Address Lookup (8022)")
TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8022"

async def _emit_usage(path: str, method: str, status: int, duration_ms: float, user_id: str | None):
    payload = {
        "service": SERVICE_ID,
        "route": path,
        "action": method.lower(),
        "quantity": 1,
        "unit": "request",
        "meta": {"status": status, "duration_ms": duration_ms},
    }
    if user_id:
        payload["user_id"] = user_id
    if SERVICE_ID == "8030":
        return
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            await client.post(f"{TELEMETRY_URL}/event", json=payload)
    except Exception:
        pass

async def _emit_cost(item: str, quantity: float, unit: str, unit_cost: float, meta: dict | None = None):
    if SERVICE_ID == "8030":
        return
    payload = {
        "service": SERVICE_ID,
        "item": item,
        "quantity": quantity,
        "unit": unit,
        "unit_cost": unit_cost,
        "meta": meta or {},
    }
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            await client.post(f"{TELEMETRY_URL}/cost", json=payload)
    except Exception:
        pass

@app.middleware("http")
async def telemetry_middleware(request: Request, call_next):
    start = time.time()
    user_id = request.headers.get("x-user-id") or request.headers.get("X-User-Id")
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = (time.time() - start) * 1000.0
        asyncio.create_task(_emit_usage(request.url.path, request.method, 500, duration_ms, user_id))
        raise
    duration_ms = (time.time() - start) * 1000.0
    asyncio.create_task(_emit_usage(request.url.path, request.method, response.status_code, duration_ms, user_id))
    return response

class LookupIn(BaseModel):
    address: str
    include_imagery: bool = True
    include_permits: bool = True

jobs = {}

@app.get("/health")
def health(): return {"status":"ok"}

@app.post("/lookup")
async def lookup(inp: LookupIn):
    jid = str(uuid.uuid4())
    jobs[jid] = {"status":"queued", "address": inp.address}
    if inp.include_imagery:
        asyncio.create_task(_emit_cost("premium_imagery", 1, "request", 0.25, {"address": inp.address}))
    if inp.include_permits:
        asyncio.create_task(_emit_cost("permit_lookup", 1, "request", 0.05, {"address": inp.address}))
    # In production: call 8025→8024→8011→8004→8026→8008 asynchronously
    return {"job_id": jid, "status": "queued"}

@app.get("/lookup/{job_id}")
def check(job_id: str):
    return jobs.get(job_id, {"error":"not_found"})
