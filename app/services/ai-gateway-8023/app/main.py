from fastapi import FastAPI, HTTPException, Header, Request
from pydantic import BaseModel
from typing import List, Dict, Optional
import os, time, httpx

from services.shared.telemetry_middleware import TelemetryMW

app = FastAPI(title="AI Gateway (8023) — quotas+budget", version="0.2.0")
app.add_middleware(TelemetryMW)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY","")
TELEMETRY_URL = os.getenv("TELEMETRY_URL","http://localhost:8030")
MAX_RPM = int(os.getenv("AI_MAX_RPM", "20"))
MAX_TOKENS_PER_MIN = int(os.getenv("AI_MAX_TOKENS_PER_MIN","20000"))
BUDGET_DAILY = float(os.getenv("AI_BUDGET_USD_DAILY","1.0"))
COST_PER_1K = float(os.getenv("AI_COST_PER_1K_TOKENS_USD","0.002"))

# naive in-memory counters per minute/day
_last_min = int(time.time()//60)
_min_calls = 0
_min_tokens = 0
_day_key = time.strftime("%Y-%m-%d")
_day_cost = 0.0

class ChatRequest(BaseModel):
    model: str = "meta-llama/llama-3.1-8b-instruct:free"
    messages: List[Dict]

def _rollover():
    global _last_min, _min_calls, _min_tokens, _day_key, _day_cost
    now_min = int(time.time()//60)
    if now_min != _last_min:
        _last_min, _min_calls, _min_tokens = now_min, 0, 0
    dk = time.strftime("%Y-%m-%d")
    if dk != _day_key:
        _day_key, _day_cost = dk, 0.0

async def _emit_usage(route, action, qty, unit, meta):
    try:
        async with httpx.AsyncClient(timeout=1.0) as c:
            await c.post(f"{TELEMETRY_URL}/event", json={
                "service":"8023","route":route,"action":action,"quantity":qty,"unit":unit,"meta":meta
            })
    except Exception:
        pass

async def _emit_cost(tokens):
    cost = (tokens/1000.0)*COST_PER_1K
    try:
        async with httpx.AsyncClient(timeout=1.0) as c:
            await c.post(f"{TELEMETRY_URL}/cost", json={
                "service":"8023","item":"openrouter_tokens","quantity":tokens,"unit":"tokens","unit_cost":COST_PER_1K
            })
    except Exception:
        pass
    return cost

@app.get("/health")
async def health(): return {"status":"ok"}

@app.post("/chat")
async def chat(req: ChatRequest, request: Request, x_user_id: Optional[str] = Header(default="anon")):
    if not OPENROUTER_API_KEY:
        raise HTTPException(400, "Missing OPENROUTER_API_KEY")
    _rollover()
    global _min_calls, _min_tokens, _day_cost
    if _min_calls >= MAX_RPM:
        raise HTTPException(429, "AI Gateway RPM limit")
    if _min_tokens >= MAX_TOKENS_PER_MIN:
        raise HTTPException(429, "AI Gateway token/min limit")
    if _day_cost >= BUDGET_DAILY:
        raise HTTPException(429, "AI Gateway daily budget exhausted")

    payload = {"model": req.model, "messages": req.messages}
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "roofing-app"
            },
            json=payload
        )
        if r.status_code == 429:
            raise HTTPException(429, "OpenRouter rate limited")
        r.raise_for_status()
        data = r.json()

    # estimate usage tokens if provided
    tokens = data.get("usage", {}).get("total_tokens", 1000)
    _min_calls += 1
    _min_tokens += tokens
    cost = await _emit_cost(tokens)
    _day_cost += cost
    await _emit_usage("/chat", "llm_call", 1, "call", {"tokens": tokens, "user": x_user_id, "cost": cost})

    return data
