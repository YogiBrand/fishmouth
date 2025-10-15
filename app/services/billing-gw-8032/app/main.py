from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
import os, httpx, asyncio, time

app = FastAPI(title="Billing Gateway (8032) — Stripe Stub")

STRIPE_KEY = os.getenv("STRIPE_SECRET_KEY","")
TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8032"

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

class CheckoutReq(BaseModel):
    user_id: str
    price_id: str
    success_url: str
    cancel_url: str

@app.get("/health")
async def health():
    return {"status":"ok"}

@app.post("/checkout")
async def checkout(c: CheckoutReq):
    if not STRIPE_KEY:
        raise HTTPException(400,"Missing STRIPE_SECRET_KEY")
    # In production: create Checkout Session via Stripe API
    await _emit_cost("stripe_checkout_session", 1, "call", 0.3, {"price_id": c.price_id, "user_id": c.user_id})
    return {"checkout_url": "https://example.com/stripe/checkout/stub"}
