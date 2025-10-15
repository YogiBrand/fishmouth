
from fastapi import FastAPI, Request
from pydantic import BaseModel
import os, asyncpg
import httpx, asyncio, time
from typing import List, Optional
from .routes_messaging import router as messaging_router
from .routes_queues import router as queues_router

app = FastAPI(title="Admin API", version="0.1.0")
app.include_router(messaging_router)
app.include_router(queues_router)
DB_URL = os.getenv("ANALYTICS_URL", os.getenv("DATABASE_URL","postgresql://user:pass@postgres:5432/app"))
TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8031"
pool = None

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

@app.on_event("startup")
async def startup():
    global pool
    pool = await asyncpg.create_pool(dsn=DB_URL, min_size=1, max_size=5)

@app.get("/health")
async def health():
    return {"status":"ok"}

class KPI(BaseModel):
    day: str
    leads: int
    emails: int
    calls: int
    dau: int

class UserRow(BaseModel):
    user_id: str
    email: str
    plan: str
    credits: int
    created_at: str

@app.get("/kpi/daily", response_model=List[KPI])
async def kpi_daily():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT day::text, leads, emails, calls, dau FROM analytics.kpi_daily ORDER BY day DESC LIMIT 30")
        return [KPI(day=r['day'], leads=r['leads'], emails=r['emails'], calls=r['calls'], dau=r['dau']) for r in rows]

@app.get("/users", response_model=List[UserRow])
async def users():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT user_id::text,email,plan,credits,created_at::text FROM analytics.users ORDER BY created_at DESC LIMIT 200")
        return [UserRow(**dict(r)) for r in rows]

class CreditUpdate(BaseModel):
    delta: int

@app.post("/users/{user_id}/credits")
async def update_credits(user_id: str, data: CreditUpdate):
    async with pool.acquire() as conn:
        await conn.execute("UPDATE analytics.users SET credits=credits+$1 WHERE user_id=$2", data.delta, user_id)
    return {"ok": True}

class Refund(BaseModel):
    amount_cents: int
    note: Optional[str] = None

@app.post("/users/{user_id}/refunds")
async def refund(user_id: str, data: Refund):
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO analytics.transactions(user_id, amount_cents, kind) VALUES($1, $2, 'refund')",
            user_id, data.amount_cents
        )
    return {"ok": True}
