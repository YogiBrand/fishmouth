from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import os

app = FastAPI(title="Vision AI (8024)", version="0.1.0")

class Health(BaseModel):
    status: str = "ok"

@app.get("/health", response_model=Health)
def health():
    return Health()

# ---- add endpoints below ----
from pydantic import BaseModel
class AnalyzeRequest(BaseModel):
    image_uri: str

@app.post("/analyze/roof")
def analyze_roof(req: AnalyzeRequest):
    # Stubbed response — replace with YOLOv8n inference
    return {
        "polygons": [],
        "damage": [],
        "score": 0.0,
        "notes": "Replace stub with model inference"
    }
