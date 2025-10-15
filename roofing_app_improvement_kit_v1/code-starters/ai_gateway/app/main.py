from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import os

app = FastAPI(title="AI Gateway (8023)", version="0.1.0")

class Health(BaseModel):
    status: str = "ok"

@app.get("/health", response_model=Health)
def health():
    return Health()

# ---- add endpoints below ----
from pydantic import BaseModel
import httpx, time

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

class ChatRequest(BaseModel):
    model: str = "meta-llama/llama-3.1-8b-instruct:free"
    messages: List[Dict]

@app.post("/chat")
async def chat(req: ChatRequest):
    if not OPENROUTER_API_KEY:
        raise HTTPException(400, "Missing OPENROUTER_API_KEY")
    # Basic free-tier guard (backoff-friendly; caller should also queue)
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "roofing-app"
            },
            json={"model": req.model, "messages": req.messages}
        )
        if r.status_code == 429:
            raise HTTPException(429, "Rate limited by OpenRouter (consider paid tier or queueing)")
        r.raise_for_status()
        return r.json()
