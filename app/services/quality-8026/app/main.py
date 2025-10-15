from fastapi import FastAPI, Request
from pydantic import BaseModel
import os, time, asyncio
import httpx

app = FastAPI(title="Quality Engine (8026)", version="0.1.0")
TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8026"

async def _emit_usage(path: str, method: str, status: int, duration_ms: float, user_id: str | None):
    if SERVICE_ID == "8030":
        return
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
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            await client.post(f"{TELEMETRY_URL}/event", json=payload)
    except Exception:
        pass

async def _emit_cost(item: str, quantity: float, unit: str, unit_cost: float, meta: dict | None = None):
    if SERVICE_ID == "8030":
        return
    data = {
        "service": SERVICE_ID,
        "item": item,
        "quantity": quantity,
        "unit": unit,
        "unit_cost": unit_cost,
        "meta": meta or {},
    }
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            await client.post(f"{TELEMETRY_URL}/cost", json=data)
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

class Health(BaseModel):
    status: str = "ok"

@app.get("/health", response_model=Health)
async def health():
    return Health()

class Signals(BaseModel):
    coverage: float
    image_gsd: float
    ocr_rate: float
    contact_success: float

@app.post("/decide")
async def decide(sig: Signals):
    score = 0.4*sig.coverage + 0.2*sig.image_gsd + 0.2*sig.ocr_rate + 0.2*sig.contact_success
    tier = "regular"
    if score < 0.7:
        tier = "optimized"
    if score < 0.5:
        tier = "priority"
    decision = {"lead_score": round(score*100), "tier": tier, "suggested_actions": ["improve_imagery","retry_contacts"]}
    asyncio.create_task(_emit_cost("quality_scoring", 1, "decision", 0.01, {"tier": tier}))
    return decision
