
from fastapi import FastAPI
from pydantic import BaseModel
import os, asyncpg
from typing import List, Optional

app = FastAPI(title="Admin API", version="0.1.0")
DB_URL = os.getenv("ANALYTICS_URL", os.getenv("DATABASE_URL","postgresql://user:pass@postgres:5432/app"))
pool = None

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
