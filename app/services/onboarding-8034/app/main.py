from fastapi import FastAPI, HTTPException
import os, asyncpg, json, httpx
from .utils.overpass import fetch_buildings
from .utils.geo import point_in_polygon, cluster_points
from .utils.scoring import score_point
from .models import SeedRequest, PolygonSeedRequest, RedeemRequest, Lead, LeadList

try:
    from services.shared.telemetry_middleware import TelemetryMW
except Exception:
    TelemetryMW = None

DB_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/app")

app = FastAPI(title="Onboarding Auto-Scan 8034")
if TelemetryMW:
    app.add_middleware(TelemetryMW)

pool = None

@app.on_event("startup")
async def start():
    global pool
    pool = await asyncpg.create_pool(dsn=DB_URL, min_size=1, max_size=5)

@app.get("/health")
async def health(): return {"status":"ok"}

@app.post("/onboarding/seed")
async def seed(req: SeedRequest):
    pts = await fetch_buildings(req.lat, req.lon, req.radius_m, req.sample)
    if not pts:
        raise HTTPException(404, "no buildings found")
    scored = []
    for (lat, lon) in pts:
        s, rev = score_point(lat, lon)
        scored.append((lat, lon, s, rev))
    scored.sort(key=lambda x: x[2], reverse=True)
    hot = scored[:10]; warm = scored[10:25]; rest = scored[25:]
    async with pool.acquire() as conn:
        for subset, status, locked in [(hot,"HOT",False),(warm,"WARM",False),(rest,"LOCKED",True)]:
            for (lat, lon, s, rev) in subset:
                details = json.dumps({"expected_revenue": rev, "notes": "seeded"})
                await conn.execute(
                    "INSERT INTO onboarding.starter_leads (user_id, lat, lon, score, status, locked, details) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)",
                    req.user_id, lat, lon, s, status, locked, details
                )
    return {"seeded": len(scored), "hot": len(hot), "warm": len(warm), "locked": len(rest)}

@app.get("/onboarding/leads/{user_id}", response_model=LeadList)
async def list_leads(user_id: str):
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT id,lat,lon,score,status,locked,details FROM onboarding.starter_leads WHERE user_id=$1 ORDER BY score DESC", user_id)
    hot, warm, locked = [],[],[]
    for r in rows:
        details = r["details"]
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except json.JSONDecodeError:
                details = {}
        details = details or {}
        item = Lead(
            id=r["id"],
            lat=r["lat"],
            lon=r["lon"],
            score=float(r["score"]),
            status=r["status"],
            locked=r["locked"],
            expected_revenue=float(details.get("expected_revenue", 0)),
            preview={"note": "blurred" if r["locked"] else "full"},
        )
        if r["status"]=="HOT": hot.append(item)
        elif r["status"]=="WARM": warm.append(item)
        else: locked.append(item)
    return LeadList(hot=hot, warm=warm, locked=locked)

@app.post("/onboarding/redeem")
async def redeem(req: RedeemRequest):
    async with pool.acquire() as conn:
        u = await conn.fetchrow("SELECT credits FROM analytics.users WHERE user_id=$1", req.user_id)
        if not u: raise HTTPException(404,"user not found")
        if u["credits"] < req.cost_credits:
            raise HTTPException(402,"insufficient credits")
        lead = await conn.fetchrow("UPDATE onboarding.starter_leads SET locked=false WHERE id=$1 AND user_id=$2 RETURNING id", req.lead_id, req.user_id)
        if not lead: raise HTTPException(404,"lead not found")
        await conn.execute("UPDATE analytics.users SET credits=credits-$1 WHERE user_id=$2", req.cost_credits, req.user_id)
        await conn.execute("INSERT INTO onboarding.unlocks(user_id, lead_id, cost_credits) VALUES($1,$2,$3)", req.user_id, req.lead_id, req.cost_credits)
    return {"ok": True, "lead_id": req.lead_id, "credits_spent": req.cost_credits}

@app.post("/onboarding/seed_polygon")
async def seed_polygon(req: PolygonSeedRequest):
    if not req.polygon or len(req.polygon) < 3:
        raise HTTPException(400, "invalid polygon")
    # sample within bbox then filter by polygon
    pts = await fetch_buildings(req.lat, req.lon, req.radius_m, req.sample)
    filtered = [(y, x) for (y, x) in pts if point_in_polygon(y, x, req.polygon)]
    if not filtered:
        raise HTTPException(404, "no buildings found in polygon")
    scored = []
    for (lat, lon) in filtered:
        s, rev = score_point(lat, lon)
        scored.append((lat, lon, s, rev))
    scored.sort(key=lambda x: x[2], reverse=True)
    hot = scored[:10]; warm = scored[10:25]; rest = scored[25:]
    async with pool.acquire() as conn:
        for subset, status, locked in [(hot,"HOT",False),(warm,"WARM",False),(rest,"LOCKED",True)]:
            for (lat, lon, s, rev) in subset:
                details = json.dumps({"expected_revenue": rev, "notes": "seeded_polygon"})
                await conn.execute(
                    "INSERT INTO onboarding.starter_leads (user_id, lat, lon, score, status, locked, details) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)",
                    req.user_id, lat, lon, s, status, locked, details
                )
    clusters = cluster_points([(lat, lon) for (lat, lon, _, _) in scored], epsilon_m=200.0)
    return {"seeded": len(scored), "clusters": clusters, "hot": len(hot), "warm": len(warm), "locked": len(rest)}


@app.post("/onboarding/leads/{lead_id}/scan")
async def scan_lead(lead_id: int, body: dict | None = None):
    user_id = (body or {}).get("user_id") if isinstance(body, dict) else None
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, user_id::text, lat, lon, details FROM onboarding.starter_leads WHERE id=$1",
            lead_id,
        )
        if not row:
            raise HTTPException(404, "lead not found")
        if user_id and row["user_id"] and row["user_id"] != user_id:
            raise HTTPException(403, "user mismatch")

        lat = float(row["lat"]) if row["lat"] is not None else None
        lon = float(row["lon"]) if row["lon"] is not None else None
        if lat is None or lon is None:
            raise HTTPException(400, "lead missing coordinates")

    # Call Vision AI
    vision_url = os.getenv("VISION_URL", "http://vision_ai_8024:8024")
    payload = {
        "property_id": f"lead-{lead_id}",
        "latitude": lat,
        "longitude": lon,
        "enable_street_view": False,
    }
    async with httpx.AsyncClient(timeout=120.0) as client:
        vr = await client.post(f"{vision_url}/analyze/roof", json=payload)
        vr.raise_for_status()
        vision = vr.json()

    # Optional quality scoring
    quality = None
    try:
        quality_url = os.getenv("QUALITY_URL", "http://quality_engine_8026:8026")
        imagery_quality = (vision.get("imagery") or {}).get("quality") or {}
        roof_analysis = vision.get("roof_analysis") or {}
        q_payload = {
            "property_profile": {"source": "vision"},
            "contact_profile": {"confidence": 0.6},
            "roof_analysis": roof_analysis,
            "imagery_quality": {
                "overall_score": imagery_quality.get("overall_score", 60.0),
                "issues": imagery_quality.get("issues", []),
                "metrics": imagery_quality.get("metrics", {}),
            },
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            qr = await client.post(f"{quality_url}/score", json=q_payload)
            qr.raise_for_status()
            quality = qr.json()
    except Exception:
        quality = None

    # Persist to details
    async with pool.acquire() as conn:
        details = row.get("details")
        if isinstance(details, str):
            try:
                details = json.loads(details)
            except json.JSONDecodeError:
                details = {}
        details = details or {}
        details.update({
            "imagery": vision.get("imagery"),
            "normalized_view": vision.get("normalized_view"),
            "roof_analysis": vision.get("roof_analysis"),
            "anomaly_bundle": vision.get("anomaly_bundle"),
            "dossier": vision.get("dossier"),
            "quality": quality,
        })
        await conn.execute(
            "UPDATE onboarding.starter_leads SET details=$2 WHERE id=$1",
            lead_id,
            json.dumps(details),
        )

    return {"ok": True, "lead_id": lead_id, "scan": {"vision": vision, "quality": quality}}
