from fastapi import FastAPI

from routes.jobs import router as jobs_router
from services.shared.telemetry_middleware import TelemetryMW

app = FastAPI(title="Orchestrator Queue (8001)", version="0.1.0")
app.add_middleware(TelemetryMW)
app.include_router(jobs_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
