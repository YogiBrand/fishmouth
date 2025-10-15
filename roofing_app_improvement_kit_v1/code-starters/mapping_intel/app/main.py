from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import os

app = FastAPI(title="Mapping Intelligence (8025)", version="0.1.0")

class Health(BaseModel):
    status: str = "ok"

@app.get("/health", response_model=Health)
def health():
    return Health()

# ---- add endpoints below ----
from pydantic import BaseModel
import time

class GeocodeRequest(BaseModel):
    address: str

@app.post("/geocode")
def geocode(req: GeocodeRequest):
    # Placeholder: wire to Nominatim with 1 r/s guard + caching
    return {"lat": 0.0, "lon": 0.0, "normalized_address": req.address}
