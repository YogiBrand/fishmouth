from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os, asyncpg, uuid
import httpx, asyncio, time
from typing import List, Optional, Dict, Any
from .routes_messaging import router as messaging_router
from .routes_queues import router as queues_router
from .routes_messaging_provider_send import router as send_router
from .routes_scraper import router as scraper_router
from .routes_leads import router as leads_router
from services.shared.telemetry_middleware import TelemetryMW

app = FastAPI(title="Admin API", version="0.1.0")
app.include_router(messaging_router)
app.include_router(queues_router)
app.include_router(send_router)
app.include_router(leads_router)
app.include_router(scraper_router)
app.add_middleware(TelemetryMW)
DB_URL = os.getenv("ANALYTICS_URL", os.getenv("DATABASE_URL","postgresql://user:pass@postgres:5432/app"))
TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8031"
pool = None
REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

# CORS (allow localhost admin UI and Vite dev by default; override via CORS_ORIGINS)
_allowed = os.getenv("CORS_ORIGINS", "http://localhost:3031,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _allowed if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SERVICE_TARGETS = [
    {"name": "Backend API", "group": "core", "url": os.getenv("BACKEND_HEALTH_URL", "http://backend:8000/health")},
    {"name": "Voice Server", "group": "core", "url": os.getenv("VOICE_HEALTH_URL", "http://voice_server:8001/readyz")},
    {"name": "Telemetry Gateway", "group": "observability", "url": os.getenv("TELEMETRY_HEALTH_URL", "http://telemetry_gw_8030:8030/health")},
    {"name": "Billing Gateway", "group": "finance", "url": os.getenv("BILLING_HEALTH_URL", "http://billing_gw_8032:8032/health")},
    {"name": "Orchestrator", "group": "pipelines", "url": os.getenv("ORCH_HEALTH_URL", "http://orchestrator:8009/readyz")},
    {"name": "Lead Generator", "group": "pipelines", "url": os.getenv("LEAD_HEALTH_URL", "http://lead-generator:8008/readyz")},
    {"name": "Enrichment Service", "group": "pipelines", "url": os.getenv("ENRICH_HEALTH_URL", "http://enrichment-service:8004/readyz")},
    {"name": "Scraper Service", "group": "pipelines", "url": os.getenv("SCRAPER_HEALTH_URL", "http://scraper-service:8011/readyz")},
    {"name": "Image Processor", "group": "vision", "url": os.getenv("IMAGE_HEALTH_URL", "http://image-processor:8012/readyz")},
    {"name": "ML Inference", "group": "vision", "url": os.getenv("ML_HEALTH_URL", "http://ml-inference:8013/readyz")},
    {"name": "Street Imagery", "group": "vision", "url": os.getenv("STREET_HEALTH_URL", "http://street-imagery:8014/readyz")},
    {"name": "Geocoder", "group": "data", "url": os.getenv("GEOCODER_HEALTH_URL", "http://geocoder-service:8015/readyz")},
]

async def _check_http_target(client: httpx.AsyncClient, target: Dict[str, Any]) -> HealthStatus:
    started = time.time()
    try:
        response = await client.get(target["url"])
        latency = (time.time() - started) * 1000.0
        status = "ok" if response.status_code < 400 else "degraded"
        message = None
        content_type = response.headers.get("content-type", "")
        if "application/json" in content_type:
            payload = response.json()
            if isinstance(payload, dict):
                message = payload.get("status") or payload.get("detail")
        else:
            body = response.text
            message = body[:140] if body else None
        return HealthStatus(
            name=target["name"],
            group=target["group"],
            status=status,
            latency_ms=round(latency, 2),
            message=message,
        )
    except Exception as exc:
        return HealthStatus(
            name=target["name"],
            group=target["group"],
            status="down",
            latency_ms=None,
            message=str(exc),
        )

async def _check_database() -> HealthStatus:
    started = time.time()
    try:
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        latency = (time.time() - started) * 1000.0
        return HealthStatus(name="Postgres", group="core", status="ok", latency_ms=round(latency, 2))
    except Exception as exc:
        return HealthStatus(name="Postgres", group="core", status="down", message=str(exc))

async def _check_redis() -> HealthStatus:
    started = time.time()
    reader = writer = None
    try:
        reader, writer = await asyncio.wait_for(asyncio.open_connection(REDIS_HOST, REDIS_PORT), timeout=1.5)
        writer.write(b"*1\r\n$4\r\nPING\r\n")
        await writer.drain()
        pong = await asyncio.wait_for(reader.readline(), timeout=1.5)
        latency = (time.time() - started) * 1000.0
        status = "ok" if pong and pong.startswith(b"+PONG") else "degraded"
        return HealthStatus(name="Redis", group="core", status=status, latency_ms=round(latency, 2))
    except Exception as exc:
        return HealthStatus(name="Redis", group="core", status="down", message=str(exc))
    finally:
        if writer is not None:
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass

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
    total_spend_usd: float = 0.0
    events_30d: int = 0
    last_seen_at: Optional[str] = None
    last_charge_at: Optional[str] = None

class UsageServiceRow(BaseModel):
    service: str
    calls: int
    change_pct: Optional[float] = None

class UsageRouteRow(BaseModel):
    service: str
    route: Optional[str]
    calls: int

class UsageSummary(BaseModel):
    total_events: int
    events_24h: int
    unique_users: int
    services: List[UsageServiceRow]
    top_routes: List[UsageRouteRow]
    history: List[Dict[str, Any]]

class CostBreakdownItem(BaseModel):
    service: str
    item: str
    cost_usd: float

class CostSummary(BaseModel):
    total_revenue: float
    total_cost: float
    total_margin: float
    margin_rate: float
    timeline: List[Dict[str, Any]]
    top_costs: List[CostBreakdownItem]

class HealthStatus(BaseModel):
    name: str
    group: str
    status: str
    latency_ms: Optional[float] = None
    message: Optional[str] = None

class TransactionRow(BaseModel):
    txn_id: str
    amount_cents: int
    kind: str
    created_at: str

class UserDetail(BaseModel):
    user: UserRow
    transactions: List[TransactionRow]
    usage: List[Dict[str, Any]]

class MessagingProviderSummary(BaseModel):
    provider: str
    tests: int
    cost_usd: float
    last_test_at: Optional[str] = None

class MessagingSummary(BaseModel):
    total_providers: int
    total_tests: int
    cloudflare_changes: int
    providers: List[MessagingProviderSummary]

@app.get("/kpi/daily", response_model=List[KPI])
async def kpi_daily():
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT day::text, leads, emails, calls, dau FROM analytics.kpi_daily ORDER BY day DESC LIMIT 30")
        return [KPI(day=r['day'], leads=r['leads'], emails=r['emails'], calls=r['calls'], dau=r['dau']) for r in rows]

@app.get("/users", response_model=List[UserRow])
async def users(search: Optional[str] = None, limit: int = 200):
    capped_limit = max(1, min(limit, 500))
    async with pool.acquire() as conn:
        if search:
            pattern = f"%{search.lower()}%"
            rows = await conn.fetch(
                """
                WITH charges AS (
                  SELECT user_id, SUM(amount_cents)/100.0 AS total_spend_usd, MAX(created_at) AS last_charge_at
                  FROM analytics.transactions
                  WHERE kind='charge'
                  GROUP BY user_id
                ),
                usage AS (
                  SELECT user_id,
                         COUNT(*) FILTER (WHERE ts >= now() - INTERVAL '30 days') AS events_30d,
                         MAX(ts) AS last_seen_at
                  FROM analytics.usage_events
                  GROUP BY user_id
                )
                SELECT u.user_id::text,
                       u.email,
                       u.plan,
                       u.credits,
                       u.created_at::text,
                       COALESCE(c.total_spend_usd,0) AS total_spend_usd,
                       COALESCE(c.last_charge_at::text, NULL) AS last_charge_at,
                       COALESCE(usage.events_30d,0) AS events_30d,
                       COALESCE(usage.last_seen_at::text, NULL) AS last_seen_at
                FROM analytics.users u
                LEFT JOIN charges c ON c.user_id = u.user_id
                LEFT JOIN usage ON usage.user_id = u.user_id
                WHERE LOWER(u.email) LIKE $1 OR LOWER(u.plan) LIKE $1
                ORDER BY usage.last_seen_at DESC NULLS LAST, u.created_at DESC
                LIMIT $2
                """,
                pattern,
                capped_limit,
            )
        else:
            rows = await conn.fetch(
                """
                WITH charges AS (
                  SELECT user_id, SUM(amount_cents)/100.0 AS total_spend_usd, MAX(created_at) AS last_charge_at
                  FROM analytics.transactions
                  WHERE kind='charge'
                  GROUP BY user_id
                ),
                usage AS (
                  SELECT user_id,
                         COUNT(*) FILTER (WHERE ts >= now() - INTERVAL '30 days') AS events_30d,
                         MAX(ts) AS last_seen_at
                  FROM analytics.usage_events
                  GROUP BY user_id
                )
                SELECT u.user_id::text,
                       u.email,
                       u.plan,
                       u.credits,
                       u.created_at::text,
                       COALESCE(c.total_spend_usd,0) AS total_spend_usd,
                       COALESCE(c.last_charge_at::text, NULL) AS last_charge_at,
                       COALESCE(usage.events_30d,0) AS events_30d,
                       COALESCE(usage.last_seen_at::text, NULL) AS last_seen_at
                FROM analytics.users u
                LEFT JOIN charges c ON c.user_id = u.user_id
                LEFT JOIN usage ON usage.user_id = u.user_id
                ORDER BY usage.last_seen_at DESC NULLS LAST, u.created_at DESC
                LIMIT $1
                """,
                capped_limit,
            )
    return [UserRow(**dict(r)) for r in rows]

@app.get("/usage/summary", response_model=UsageSummary)
async def usage_summary(days: int = 14):
    window = max(1, min(days, 90))
    async with pool.acquire() as conn:
        services = await conn.fetch(
            """
            SELECT service, SUM(calls)::bigint AS calls
            FROM analytics.api_usage_daily
            WHERE day >= current_date - ($1::int) * INTERVAL '1 day'
            GROUP BY service
            ORDER BY calls DESC
            """,
            window,
        )
        prev_services = await conn.fetch(
            """
            SELECT service, SUM(calls)::bigint AS calls
            FROM analytics.api_usage_daily
            WHERE day < current_date - ($1::int) * INTERVAL '1 day'
              AND day >= current_date - ($1::int * 2) * INTERVAL '1 day'
            GROUP BY service
            """,
            window,
        )
        prev_lookup = {row["service"]: row["calls"] for row in prev_services}

        service_rows = []
        for row in services:
            prev_calls = prev_lookup.get(row["service"])
            change_pct = None
            if prev_calls and prev_calls > 0:
                change_pct = round(((row["calls"] - prev_calls) / prev_calls) * 100, 2)
            elif prev_calls == 0 and row["calls"] > 0:
                change_pct = 100.0
            service_rows.append(
                UsageServiceRow(service=row["service"], calls=row["calls"], change_pct=change_pct)
            )

        top_routes = await conn.fetch(
            """
            SELECT service, route, SUM(calls)::bigint AS calls
            FROM analytics.api_usage_daily
            WHERE day >= current_date - ($1::int) * INTERVAL '1 day'
            GROUP BY service, route
            ORDER BY calls DESC
            LIMIT 12
            """,
            window,
        )

        usage_totals = await conn.fetchrow(
            """
            SELECT
              COUNT(*)::bigint AS events,
              COUNT(*) FILTER (WHERE ts >= now() - INTERVAL '24 hours')::bigint AS events_24h,
              COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL)::bigint AS unique_users
            FROM analytics.usage_events
            WHERE ts >= now() - ($1::int) * INTERVAL '1 day'
            """,
            window,
        )

        history_rows = await conn.fetch(
            """
            SELECT day::date AS day, service, SUM(calls)::bigint AS calls
            FROM analytics.api_usage_daily
            WHERE day >= current_date - ($1::int) * INTERVAL '1 day'
            GROUP BY day, service
            ORDER BY day ASC
            """,
            window,
        )

        history_map: Dict[str, Dict[str, Any]] = {}
        for row in history_rows:
            day = row["day"].isoformat()
            entry = history_map.setdefault(day, {"day": day, "total_calls": 0})
            entry[row["service"]] = row["calls"]
            entry["total_calls"] += row["calls"]

    return UsageSummary(
        total_events=int(usage_totals["events"]) if usage_totals else 0,
        events_24h=int(usage_totals["events_24h"]) if usage_totals else 0,
        unique_users=int(usage_totals["unique_users"]) if usage_totals else 0,
        services=service_rows,
        top_routes=[
            UsageRouteRow(service=row["service"], route=row["route"], calls=row["calls"]) for row in top_routes
        ],
        history=sorted(history_map.values(), key=lambda item: item["day"]),
    )

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

@app.get("/users/{user_id}", response_model=UserDetail)
async def user_detail(user_id: str):
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="invalid user id")
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            WITH charges AS (
              SELECT user_id, SUM(amount_cents)/100.0 AS total_spend_usd, MAX(created_at) AS last_charge_at
              FROM analytics.transactions
              WHERE kind='charge'
              GROUP BY user_id
            ),
            usage AS (
              SELECT user_id,
                     COUNT(*) FILTER (WHERE ts >= now() - INTERVAL '30 days') AS events_30d,
                     MAX(ts) AS last_seen_at
              FROM analytics.usage_events
              GROUP BY user_id
            )
            SELECT u.user_id::text,
                   u.email,
                   u.plan,
                   u.credits,
                   u.created_at::text,
                   COALESCE(c.total_spend_usd,0) AS total_spend_usd,
                   COALESCE(c.last_charge_at::text, NULL) AS last_charge_at,
                   COALESCE(usage.events_30d,0) AS events_30d,
                   COALESCE(usage.last_seen_at::text, NULL) AS last_seen_at
            FROM analytics.users u
            LEFT JOIN charges c ON c.user_id = u.user_id
            LEFT JOIN usage ON usage.user_id = u.user_id
            WHERE u.user_id = $1::uuid
            """,
            user_uuid,
        )
        if not row:
            raise HTTPException(status_code=404, detail="user not found")

        transactions = await conn.fetch(
            """
            SELECT txn_id::text, amount_cents, kind, created_at::text
            FROM analytics.transactions
            WHERE user_id = $1::uuid
            ORDER BY created_at DESC
            LIMIT 20
            """,
            user_uuid,
        )

        usage_rows = await conn.fetch(
            """
            SELECT
              date_trunc('day', ts)::date AS day,
              COUNT(*) AS events,
              COUNT(*) FILTER (WHERE action='lead_created') AS leads,
              COUNT(*) FILTER (WHERE action='email_sent') AS emails,
              COUNT(*) FILTER (WHERE action='call_started') AS calls
            FROM analytics.usage_events
            WHERE user_id = $1::uuid
              AND ts >= now() - INTERVAL '30 days'
            GROUP BY day
            ORDER BY day ASC
            """,
            user_uuid,
        )

    usage_timeline = [
        {
            "day": row["day"].isoformat(),
            "events": row["events"],
            "leads": row["leads"],
            "emails": row["emails"],
            "calls": row["calls"],
        }
        for row in usage_rows
    ]

    return UserDetail(
        user=UserRow(**dict(row)),
        transactions=[
            TransactionRow(txn_id=r["txn_id"], amount_cents=r["amount_cents"], kind=r["kind"], created_at=r["created_at"])
            for r in transactions
        ],
        usage=usage_timeline,
    )

@app.get("/costs/summary", response_model=CostSummary)
async def costs_summary(days: int = 30):
    window = max(1, min(days, 120))
    async with pool.acquire() as conn:
        timeline_rows = await conn.fetch(
            """
            SELECT day::date AS day, COALESCE(revenue_usd,0) AS revenue_usd,
                   COALESCE(cost_usd,0) AS cost_usd,
                   COALESCE(margin_usd,0) AS margin_usd
            FROM analytics.margin_daily
            WHERE day >= current_date - ($1::int) * INTERVAL '1 day'
            ORDER BY day ASC
            """,
            window,
        )

        totals = await conn.fetchrow(
            """
            SELECT
              COALESCE(SUM(revenue_usd),0) AS revenue,
              COALESCE(SUM(cost_usd),0) AS cost,
              COALESCE(SUM(margin_usd),0) AS margin
            FROM analytics.margin_daily
            WHERE day >= current_date - ($1::int) * INTERVAL '1 day'
            """,
            window,
        )

        cost_breakdown = await conn.fetch(
            """
            SELECT service, item, SUM(quantity*unit_cost)::numeric AS cost_usd
            FROM analytics.cost_events
            WHERE ts >= now() - ($1::int) * INTERVAL '1 day'
            GROUP BY service, item
            ORDER BY cost_usd DESC
            LIMIT 12
            """,
            window,
        )

    total_revenue = float(totals["revenue"]) if totals else 0.0
    total_cost = float(totals["cost"]) if totals else 0.0
    total_margin = float(totals["margin"]) if totals else 0.0
    margin_rate = (total_margin / total_revenue * 100) if total_revenue else 0.0

    timeline = [
        {
            "day": row["day"].isoformat(),
            "revenue_usd": float(row["revenue_usd"]),
            "cost_usd": float(row["cost_usd"]),
            "margin_usd": float(row["margin_usd"]),
        }
        for row in timeline_rows
    ]

    return CostSummary(
        total_revenue=round(total_revenue, 2),
        total_cost=round(total_cost, 2),
        total_margin=round(total_margin, 2),
        margin_rate=round(margin_rate, 2),
        timeline=timeline,
        top_costs=[
            CostBreakdownItem(service=row["service"], item=row["item"], cost_usd=round(float(row["cost_usd"]), 2))
            for row in cost_breakdown
        ],
    )

@app.get("/health/services", response_model=List[HealthStatus])
async def services_health():
    async with httpx.AsyncClient(timeout=2.5) as client:
        http_results = await asyncio.gather(*[_check_http_target(client, target) for target in SERVICE_TARGETS])

    db_status = await _check_database()
    redis_status = await _check_redis()

    return [db_status, redis_status, *http_results]

@app.get("/messaging/summary", response_model=MessagingSummary)
async def messaging_summary(days: int = 30):
    window = max(1, min(days, 90))
    async with pool.acquire() as conn:
        provider_rows = await conn.fetch(
            """
            SELECT
              COALESCE(meta->>'provider', 'unknown') AS provider,
              COUNT(*) AS tests,
              SUM(quantity*unit_cost)::numeric AS cost_usd,
              MAX(ts)::text AS last_test_at
            FROM analytics.cost_events
            WHERE service = $1
              AND ts >= now() - ($2::int) * INTERVAL '1 day'
              AND item = 'admin_messaging_test'
            GROUP BY provider
            ORDER BY tests DESC
            """,
            SERVICE_ID,
            window,
        )

        cloudflare_changes = await conn.fetchval(
            """
            SELECT COUNT(*)
            FROM analytics.cost_events
            WHERE service = $1
              AND item = 'cloudflare_dns_change'
              AND ts >= now() - ($2::int) * INTERVAL '1 day'
            """,
            SERVICE_ID,
            window,
        )

    total_tests = sum(row["tests"] for row in provider_rows) if provider_rows else 0

    return MessagingSummary(
        total_providers=len(provider_rows),
        total_tests=total_tests,
        cloudflare_changes=cloudflare_changes or 0,
        providers=[
            MessagingProviderSummary(
                provider=row["provider"],
                tests=row["tests"],
                cost_usd=round(float(row["cost_usd"]), 4) if row["cost_usd"] is not None else 0.0,
                last_test_at=row["last_test_at"],
            )
            for row in provider_rows
        ],
    )
