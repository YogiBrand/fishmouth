from fastapi import FastAPI
from pydantic import BaseModel
import os, asyncio
import httpx

from services.shared.telemetry_middleware import TelemetryMW

app = FastAPI(title="Event Monitor (8028)", version="0.1.0")
app.add_middleware(TelemetryMW)
TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8028"

async def _emit_cost(item: str, quantity: float, unit: str, unit_cost: float, meta: dict | None = None):
    if SERVICE_ID == "8030":
        return
    data = {
        "service": SERVICE_ID,
        "item": item,
        "quantity": quantity,
        "unit": unit,
        "unit_cost": unit_cost,
        "meta": meta or {},
    }
    try:
        async with httpx.AsyncClient(timeout=1.0) as client:
            await client.post(f"{TELEMETRY_URL}/cost", json=data)
    except Exception:
        pass

class Health(BaseModel):
    status: str = "ok"

@app.get("/health", response_model=Health)
async def health():
    return Health()

@app.get("/scan")
async def scan():
    asyncio.create_task(_emit_cost("weather_data_ingest", 1, "scan", 0.05, {}))
    # Poll NOAA/NWS/NCEI here, then publish StormEvent
    return {"scanned": True, "events": []}
