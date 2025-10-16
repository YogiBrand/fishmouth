from __future__ import annotations

import asyncio
import json
import logging
import os
import time
import uuid
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import asyncpg
import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from services.shared.telemetry_middleware import TelemetryMW

from services.providers.property_enrichment import PropertyEnrichmentService, PropertyProfile

logger = logging.getLogger("address-lookup-8022")

app = FastAPI(title="Address Lookup (8022)", version="1.0.0")
app.add_middleware(TelemetryMW)

TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8022"
MAPPING_SERVICE_URL = os.getenv("MAPPING_SERVICE_URL", "http://mapping_intel_8025:8025")
VISION_SERVICE_URL = os.getenv("VISION_SERVICE_URL", "http://vision_ai_8024:8024")
OSINT_SERVICE_URL = os.getenv("OSINT_SERVICE_URL", "http://osint_contacts_8027:8027")
QUALITY_SERVICE_URL = os.getenv("QUALITY_SERVICE_URL", "http://quality_engine_8026:8026")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@postgres:5432/app")

jobs: Dict[str, Dict[str, Any]] = {}
jobs_lock = asyncio.Lock()
db_pool: Optional[asyncpg.pool.Pool] = None


def _encode_json(payload: Optional[Any]) -> Optional[str]:
    if payload is None:
        return None
    if isinstance(payload, str):
        return payload
    try:
        return json.dumps(payload, default=str)
    except Exception:
        logger.exception("job_record_json_encode_failed")
        return None


def _decode_json(value: Any) -> Optional[Any]:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, (bytes, bytearray)):
        value = value.decode("utf-8", "ignore")
    if isinstance(value, str):
        try:
            return json.loads(value)
        except Exception:
            logger.debug("job_record_json_decode_failed")
            return None
    return None


def _to_epoch(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc).timestamp() if value.tzinfo is None else value.timestamp()
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _coerce_datetime(value: Any) -> Optional[datetime]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(float(value), tz=timezone.utc)
    return None


def _row_to_job(row: asyncpg.Record) -> Dict[str, Any]:
    data = dict(row)
    fallback_result = {
        "address": {
            "input": data.get("address_input"),
            "normalized": data.get("normalized_address"),
            "geocode": {
                "lat": data.get("lat"),
                "lon": data.get("lon"),
            },
        },
        "enrichment": _decode_json(data.get("enrichment")),
        "contact": _decode_json(data.get("contact")),
        "analysis": _decode_json(data.get("analysis")),
        "quality": _decode_json(data.get("quality")),
    }
    updated_epoch = _to_epoch(data.get("updated_at"))
    if updated_epoch is not None:
        fallback_result["generated_at"] = updated_epoch

    result = _decode_json(data.get("result")) or fallback_result

    job = {
        "job_id": data.get("job_id"),
        "status": data.get("status") or "processing",
        "stage": data.get("stage") or "queued",
        "started_at": _to_epoch(data.get("started_at")) or time.time(),
        "completed_at": _to_epoch(data.get("completed_at")),
        "result": result,
        "error": data.get("error"),
    }
    return job


async def _load_recent_jobs(limit: int = 100) -> None:
    if db_pool is None:
        return
    try:
        async with db_pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT job_id, address_input, normalized_address, lat, lon,
                       status, stage, enrichment, contact, analysis, quality,
                       result, error, started_at, completed_at, updated_at
                FROM address_lookup_jobs
                ORDER BY updated_at DESC
                LIMIT $1
                """,
                limit,
            )
    except Exception:
        logger.exception("job_cache_warm_failed")
        return

    hydrated: Dict[str, Dict[str, Any]] = {}
    for row in rows:
        job_payload = _row_to_job(row)
        job_id = job_payload.get("job_id")
        if job_id:
            hydrated[job_id] = job_payload

    if hydrated:
        async with jobs_lock:
            jobs.update(hydrated)


@app.on_event("startup")
async def _startup() -> None:
    global db_pool
    try:
        db_pool = await asyncpg.create_pool(dsn=DATABASE_URL, min_size=1, max_size=5)
        await _load_recent_jobs()
        logger.info("address_lookup_db_connected")
    except Exception:
        logger.exception("address_lookup_db_connect_failed")
        db_pool = None


@app.on_event("shutdown")
async def _shutdown() -> None:
    global db_pool
    pool = db_pool
    db_pool = None
    if pool is not None:
        await pool.close()


class Health(BaseModel):
    status: str = "ok"


@app.get("/health", response_model=Health)
async def health() -> Health:
    return Health()


class LookupRequest(BaseModel):
    address: str = Field(..., description="Free-form mailing address to analyze.")


class LookupResponse(BaseModel):
    job_id: str
    status: str
    stage: str


class JobDetail(BaseModel):
    job_id: str
    status: str
    stage: str
    started_at: float
    completed_at: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


async def _fetch_job_from_db(job_id: str) -> Optional[JobDetail]:
    if db_pool is None:
        return None
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT job_id, address_input, normalized_address, lat, lon,
                       status, stage, enrichment, contact, analysis, quality,
                       result, error, started_at, completed_at, updated_at
                FROM address_lookup_jobs
                WHERE job_id = $1
                """,
                job_id,
            )
    except Exception:
        logger.exception("job_db_fetch_failed", extra={"job_id": job_id})
        return None

    if row is None:
        return None

    job_payload = _row_to_job(row)
    async with jobs_lock:
        jobs[job_id] = job_payload
    return JobDetail(**job_payload)


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
        logger.exception("failed_emitting_cost_event")


async def _upsert_job_record(
    job_id: str,
    *,
    address_input: Optional[str] = None,
    normalized_address: Optional[str] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    status: Optional[str] = None,
    stage: Optional[str] = None,
    enrichment: Optional[Dict[str, Any]] = None,
    contact: Optional[Dict[str, Any]] = None,
    analysis: Optional[Dict[str, Any]] = None,
    quality: Optional[Dict[str, Any]] = None,
    result: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None,
    started_at: Optional[Any] = None,
    completed_at: Optional[Any] = None,
) -> None:
    if db_pool is None:
        return
    payload = {
        "job_id": job_id,
        "address_input": address_input,
        "normalized_address": normalized_address,
        "lat": lat,
        "lon": lon,
        "status": status,
        "stage": stage,
        "enrichment": _encode_json(enrichment),
        "contact": _encode_json(contact),
        "analysis": _encode_json(analysis),
        "quality": _encode_json(quality),
        "result": _encode_json(result),
        "error": error,
        "started_at": _coerce_datetime(started_at),
        "completed_at": _coerce_datetime(completed_at),
    }
    statement = """
    INSERT INTO address_lookup_jobs (
        job_id,
        address_input,
        normalized_address,
        lat,
        lon,
        status,
        stage,
        enrichment,
        contact,
        analysis,
        quality,
        result,
        error,
        started_at,
        completed_at
    )
    VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        COALESCE($6, 'processing'),
        COALESCE($7, 'queued'),
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        COALESCE($14, NOW()),
        $15
    )
    ON CONFLICT (job_id)
    DO UPDATE SET
        address_input = COALESCE(EXCLUDED.address_input, address_lookup_jobs.address_input),
        normalized_address = COALESCE(EXCLUDED.normalized_address, address_lookup_jobs.normalized_address),
        lat = COALESCE(EXCLUDED.lat, address_lookup_jobs.lat),
        lon = COALESCE(EXCLUDED.lon, address_lookup_jobs.lon),
        status = COALESCE(EXCLUDED.status, address_lookup_jobs.status),
        stage = COALESCE(EXCLUDED.stage, address_lookup_jobs.stage),
        enrichment = COALESCE(EXCLUDED.enrichment, address_lookup_jobs.enrichment),
        contact = COALESCE(EXCLUDED.contact, address_lookup_jobs.contact),
        analysis = COALESCE(EXCLUDED.analysis, address_lookup_jobs.analysis),
        quality = COALESCE(EXCLUDED.quality, address_lookup_jobs.quality),
        result = COALESCE(EXCLUDED.result, address_lookup_jobs.result),
        error = COALESCE(EXCLUDED.error, address_lookup_jobs.error),
        started_at = COALESCE(EXCLUDED.started_at, address_lookup_jobs.started_at),
        completed_at = COALESCE(EXCLUDED.completed_at, address_lookup_jobs.completed_at),
        updated_at = NOW();
    """
    async with db_pool.acquire() as conn:
        await conn.execute(
            statement,
            payload["job_id"],
            payload["address_input"],
            payload["normalized_address"],
            payload["lat"],
            payload["lon"],
            payload["status"],
            payload["stage"],
            payload["enrichment"],
            payload["contact"],
            payload["analysis"],
            payload["quality"],
            payload["result"],
            payload["error"],
            payload["started_at"],
            payload["completed_at"],
        )


async def _update_job(job_id: str, **changes: Any) -> None:
    async with jobs_lock:
        if job_id in jobs:
            jobs[job_id].update(changes)


async def _call_geocoder(address: str) -> Dict[str, Any]:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{MAPPING_SERVICE_URL.rstrip('/')}/geocode",
            json={"address": address},
        )
        resp.raise_for_status()
        return resp.json()


async def _call_vision(property_id: str, latitude: float, longitude: float, profile: Optional[PropertyProfile]) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "property_id": property_id,
        "latitude": latitude,
        "longitude": longitude,
    }
    if profile is not None:
        payload["property_profile"] = {k: v for k, v in asdict(profile).items() if v is not None}
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{VISION_SERVICE_URL.rstrip('/')}/analyze/roof",
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()

async def _call_contact(address: str, city: Optional[str], state: Optional[str]) -> Optional[Dict[str, Any]]:
    payload: Dict[str, Any] = {"address": address}
    if city:
        payload["city"] = city
    if state:
        payload["state"] = state
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{OSINT_SERVICE_URL.rstrip('/')}/discover", json=payload)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


async def _call_quality(
    property_profile: Dict[str, Any],
    contact_profile: Dict[str, Any],
    vision_result: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    roof_analysis = vision_result.get("roof_analysis")
    imagery = vision_result.get("imagery", {})
    imagery_quality = imagery.get("quality")
    if not roof_analysis or not imagery_quality:
        return None

    payload = {
        "property_profile": property_profile,
        "contact_profile": contact_profile,
        "roof_analysis": roof_analysis,
        "imagery_quality": imagery_quality,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{QUALITY_SERVICE_URL.rstrip('/')}/score", json=payload)
    resp.raise_for_status()
    return resp.json()


async def _enrich_property(address: str, latitude: float, longitude: float) -> Optional[PropertyProfile]:
    service = PropertyEnrichmentService()
    try:
        profile = await service.enrich(address, latitude, longitude)
        return profile
    except Exception:
        logger.exception("property_enrichment_failed", extra={"address": address})
        return None
    finally:
        try:
            await service.aclose()
        except Exception:
            pass


async def _run_job(job_id: str, address: str) -> None:
    start = time.time()
    try:
        await _update_job(job_id, stage="geocoding")
        await _upsert_job_record(job_id, stage="geocoding")
        geocode = await _call_geocoder(address)
        lat = geocode.get("lat")
        lon = geocode.get("lon")
        if lat is None or lon is None:
            raise ValueError("geocoder_missing_coordinates")

        normalized_address = geocode.get("normalized_address", address)
        await _emit_cost("lookup_geocode", 1, "request", 0.01, {"address": normalized_address, "provider": geocode.get("source")})

        await _update_job(job_id, stage="enrichment")
        await _upsert_job_record(
            job_id,
            normalized_address=normalized_address,
            lat=float(lat),
            lon=float(lon),
            stage="enrichment",
        )
        property_profile = await _enrich_property(normalized_address, float(lat), float(lon))
        property_payload = asdict(property_profile) if property_profile else None

        components = geocode.get("components") or {}
        city = (
            components.get("city")
            or components.get("town")
            or components.get("municipality")
            or components.get("suburb")
            or components.get("borough")
        )
        state = components.get("state") or components.get("region")

        await _update_job(job_id, stage="contact_enrichment")
        contact_profile = await _call_contact(normalized_address, city, state)
        await _upsert_job_record(
            job_id,
            enrichment=property_payload,
            stage="contact_enrichment",
        )
        if contact_profile:
            await _emit_cost(
                "lookup_contact_enrichment",
                1,
                "lookup",
                0.05 if contact_profile.get("source") == "remote" else 0.0,
                {"address": normalized_address, "provider": contact_profile.get("source")},
            )
        await _upsert_job_record(
            job_id,
            contact=contact_profile,
        )

        await _update_job(job_id, stage="vision_analysis")
        vision_result = await _call_vision(
            property_id=job_id,
            latitude=float(lat),
            longitude=float(lon),
            profile=property_profile,
        )
        await _emit_cost(
            "lookup_imagery_analysis",
            1,
            "analysis",
            0.35,
            {"address": normalized_address, "imagery_provider": vision_result.get("imagery", {}).get("source")},
        )
        await _upsert_job_record(
            job_id,
            analysis=vision_result,
            stage="vision_analysis",
        )

        contact_payload = contact_profile or {}

        await _update_job(job_id, stage="quality_scoring")
        quality_result = None
        try:
            quality_result = await _call_quality(property_payload or {"source": "synthetic"}, contact_payload or {"confidence": 0.3}, vision_result)
        except Exception as exc:
            logger.exception("quality_scoring_failed", extra={"job_id": job_id, "error": str(exc)})
            quality_result = None
        await _upsert_job_record(
            job_id,
            quality=quality_result,
            stage="quality_scoring",
        )
        if quality_result:
            await _emit_cost(
                "lookup_quality_scoring",
                1,
                "analysis",
                0.02,
                {
                    "address": normalized_address,
                    "priority": quality_result.get("score", {}).get("priority"),
                    "quality_status": quality_result.get("quality_status"),
                },
            )

        result: Dict[str, Any] = {
            "address": {
                "input": address,
                "normalized": normalized_address,
                "geocode": geocode,
            },
            "enrichment": property_payload or None,
            "contact": contact_payload or None,
            "analysis": vision_result,
            "quality": quality_result,
        }

        finished = time.time()
        result["generated_at"] = finished

        await _upsert_job_record(
            job_id,
            status="complete",
            stage="complete",
            enrichment=property_payload or None,
            contact=contact_payload or None,
            analysis=vision_result,
            quality=quality_result,
            result=result,
            completed_at=finished,
        )
        await _update_job(
            job_id,
            status="complete",
            stage="complete",
            result=result,
            completed_at=finished,
        )
    except Exception as exc:
        logger.exception("address_lookup_failed", extra={"job_id": job_id})
        failed_at = time.time()
        await _upsert_job_record(
            job_id,
            status="failed",
            stage="error",
            error=str(exc),
            completed_at=failed_at,
        )
        await _update_job(
            job_id,
            status="failed",
            stage="error",
            error=str(exc),
            completed_at=failed_at,
        )


@app.post("/lookup", response_model=LookupResponse)
async def lookup(req: LookupRequest) -> LookupResponse:
    job_id = str(uuid.uuid4())
    now = time.time()
    async with jobs_lock:
        jobs[job_id] = {
            "job_id": job_id,
            "status": "processing",
            "stage": "queued",
            "started_at": now,
            "completed_at": None,
            "result": None,
            "error": None,
        }
    await _upsert_job_record(
        job_id,
        address_input=req.address,
        status="processing",
        stage="queued",
        started_at=now,
    )
    asyncio.create_task(_run_job(job_id, req.address))
    return LookupResponse(job_id=job_id, status="processing", stage="queued")


@app.get("/lookup/{job_id}", response_model=JobDetail)
async def get_lookup(job_id: str) -> JobDetail:
    async with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        record = await _fetch_job_from_db(job_id)
        if record is not None:
            return record
        raise HTTPException(status_code=404, detail="job_not_found")
    return JobDetail(**job)
