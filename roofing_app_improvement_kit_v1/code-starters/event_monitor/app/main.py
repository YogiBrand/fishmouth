from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import os

app = FastAPI(title="Event Monitor (8028)", version="0.1.0")

class Health(BaseModel):
    status: str = "ok"

@app.get("/health", response_model=Health)
def health():
    return Health()

# ---- add endpoints below ----
@app.get("/scan")
def scan():
    # Poll NOAA/NWS/NCEI here, then publish StormEvent
    return {"scanned": True, "events": []}
