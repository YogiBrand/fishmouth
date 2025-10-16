from __future__ import annotations

import asyncio
import os
from dataclasses import asdict
from typing import Any, Dict, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from services.shared.telemetry_middleware import TelemetryMW

from services.providers.contact_enrichment import ContactEnrichmentService

app = FastAPI(title="OSINT Contacts (8027)", version="1.0.0")
app.add_middleware(TelemetryMW)

TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8027"


async def _emit_cost(item: str, quantity: float, unit: str, unit_cost: float, meta: Dict[str, Any]) -> None:
    payload = {
        "service": SERVICE_ID,
        "item": item,
        "quantity": quantity,
        "unit": unit,
        "unit_cost": unit_cost,
        "meta": meta,
    }
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            await client.post(f"{TELEMETRY_URL}/cost", json=payload)
    except Exception:
        pass


class Health(BaseModel):
    status: str = "ok"


@app.get("/health", response_model=Health)
async def health() -> Health:
    return Health()


class DiscoverRequest(BaseModel):
    address: str = Field(..., description="Normalized street address.")
    city: Optional[str] = Field(default=None)
    state: Optional[str] = Field(default=None)


class ContactProfileOut(BaseModel):
    homeowner_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    length_of_residence_years: Optional[int] = None
    household_income: Optional[int] = None
    confidence: float
    source: str


@app.post("/discover", response_model=ContactProfileOut)
async def discover(req: DiscoverRequest) -> ContactProfileOut:
    service = ContactEnrichmentService()
    try:
        profile = await service.enrich(req.address, req.city, req.state)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"contact_enrichment_failed: {exc}") from exc
    finally:
        try:
            await service.aclose()
        except Exception:
            pass

    asyncio.create_task(
        _emit_cost(
            "contact_discovery",
            1,
            "lookup",
            0.05 if profile.source == "remote" else 0.0,
            {"address": req.address, "provider": profile.source},
        )
    )
    return ContactProfileOut(**asdict(profile))
