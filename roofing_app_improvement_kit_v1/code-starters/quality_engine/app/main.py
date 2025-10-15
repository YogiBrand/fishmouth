from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import os

app = FastAPI(title="Quality Engine (8026)", version="0.1.0")

class Health(BaseModel):
    status: str = "ok"

@app.get("/health", response_model=Health)
def health():
    return Health()

# ---- add endpoints below ----
from pydantic import BaseModel

class Signals(BaseModel):
    coverage: float
    image_gsd: float
    ocr_rate: float
    contact_success: float

@app.post("/decide")
def decide(sig: Signals):
    score = 0.4*sig.coverage + 0.2*sig.image_gsd + 0.2*sig.ocr_rate + 0.2*sig.contact_success
    tier = "regular"
    if score < 0.7:
        tier = "optimized"
    if score < 0.5:
        tier = "priority"
    return {"lead_score": round(score*100), "tier": tier, "suggested_actions": ["improve_imagery","retry_contacts"]}
