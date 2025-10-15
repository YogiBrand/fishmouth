from fastapi import FastAPI, Request
from pydantic import BaseModel
import os, asyncpg, time, json

app = FastAPI(title="Telemetry Gateway", version="0.1.0")
DB_URL = os.getenv("ANALYTICS_URL", os.getenv("DATABASE_URL","postgresql://user:pass@postgres:5432/app"))
pool = None

@app.middleware("http")
async def latency_middleware(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    request.state.duration_ms = (time.time() - start) * 1000.0
    return response

class UsageEvent(BaseModel):
    service: str
    route: str | None = None
    action: str
    user_id: str | None = None
    entity: str | None = None
    quantity: float | None = 1
    unit: str | None = "call"
    meta: dict | None = None

class CostEvent(BaseModel):
    service: str
    item: str
    quantity: float
    unit: str
    unit_cost: float
    meta: dict | None = None

@app.on_event("startup")
async def startup():
    global pool
    pool = await asyncpg.create_pool(dsn=DB_URL, min_size=1, max_size=5)

@app.get("/health")
async def health():
    return {"status":"ok"}

@app.post("/event")
async def event(ev: UsageEvent):
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO analytics.usage_events(service, route, action, user_id, entity, quantity, unit, meta) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
            ev.service, ev.route, ev.action, ev.user_id, ev.entity, ev.quantity, ev.unit,
            json.dumps(ev.meta) if ev.meta is not None else None
        )
    return {"ok": True}

@app.post("/cost")
async def cost(ev: CostEvent):
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO analytics.cost_events(service, item, quantity, unit, unit_cost, meta) VALUES($1,$2,$3,$4,$5,$6)",
            ev.service, ev.item, ev.quantity, ev.unit, ev.unit_cost,
            json.dumps(ev.meta) if ev.meta is not None else None
        )
    return {"ok": True}
