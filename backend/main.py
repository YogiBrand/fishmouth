import base64
import csv
import hmac
import io
import json
import sys
import os
import uuid

# Add parent directory to path for shared imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

shared_candidates = [
    os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "shared")),
    os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "shared")),
    "/shared",
]
for shared_path in shared_candidates:
    if os.path.isdir(shared_path) and shared_path not in sys.path:
        sys.path.insert(0, shared_path)
        break

import httpx
import sentry_sdk
import structlog
from fastapi import FastAPI, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, status, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import func, text
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any, Literal
from datetime import date, datetime, timedelta
import secrets
from pathlib import Path

from database import engine, get_db, Base, SessionLocal
from models import (
    User,
    AreaScan,
    Lead,
    LeadPriority,
    LeadStatus,
    VoiceCall,
    VoiceCallTurn,
    VoiceBooking,
    VoiceConfiguration,
    VoiceMetricsDaily,
    LeadActivity,
    VoiceCallEvent,
    BillingUsage,
    AuditLog,
    Contractor,
    WalletPromotion,
)
from sqlalchemy.orm import Session
from pydantic import BaseModel
from auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    get_current_admin,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from services.lead_generation_service import LeadGenerationService
from services.sequence_service import SequenceService
from services.billing_service import aggregate_usage_for_period, calculate_platform_margin, get_billing_summary
from services.billing_stripe import create_checkout_session, create_subscription, ensure_customer
from services.voice_agent_service import VoiceAgentService, VoiceAnalyticsService, VoiceCallConfig
from services.voice.streaming import WebsocketTelnyxStream, register_stream
from services.scan_progress import progress_notifier
from services.audit_service import record_audit_event
from services.encryption import decrypt_value
from services.promotion_service import (
    lock_promotion as promotion_lock_promotion,
    serialize_promotion as serialize_wallet_promotion,
)
from config import get_settings
from app.api.v1.ai_voice import router as ai_voice_router
from app.api.v1.contagion import router as contagion_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.reports import router as reports_router
from app.api.v1.enhanced_reports import router as enhanced_reports_router
from app.api.v1.events import router as events_router
from app.api.v1.webhooks import router as webhooks_router
from app.api.v1.branding import router as branding_router
from app.api.v1.mailers import router as mailers_router
from app.api.v1.scan_jobs import router as scan_jobs_router
from app.api.v1.scans import router as scans_router
from app.api.v1.reports_render import router as reports_render_router
from app.api.v1.public_shares import (
    public_router as public_view_router,
    router as shares_router,
)
from app.api.v1.shortlinks import router as shortlinks_router
from app.api.v1.health import router as health_router
from app.api.v1.assistant import router as assistant_router
from app.api.v1.app_config import router as app_config_router
from app.api.v1.activity_feed import router as activity_router
from app.api.v1.sequences import (
    sequences_router as sequences_api_router,
    enrollments_router as enrollments_api_router,
)
from app.api.v1.templates import router as templates_router
from app.api.v1.outbox import router as outbox_router
from app.api.v1.growth import router as growth_router
from app.api.v1.geoip import router as geoip_router
from app.api.v1.geo import router as geo_router
from app.api.v1.assets import router as assets_router
from app.api.v1.maps import router as maps_router
from app.api.v1.wallet import router as wallet_router
from app.api.v1.marketing import router as marketing_router
from app.api.v1.geo_guess import router as geo_guess_router
from services.sequence_delivery import get_delivery_adapters
from app.services.activity_stream import activity_notifier
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from logging_config import bind_request_context, clear_request_context, configure_logging
from shared.observability import init_tracing
from app.lib import request_id_middleware_factory
from app.lib.otel import setup_otel

# Create tables
Base.metadata.create_all(bind=engine)

settings = get_settings()
configure_logging()
init_tracing("backend")
setup_otel("fishmouth-backend")

if settings.instrumentation.sentry_dsn:
    sentry_sdk.init(
        dsn=str(settings.instrumentation.sentry_dsn),
        traces_sample_rate=settings.instrumentation.sentry_traces_sample_rate,
        profiles_sample_rate=settings.instrumentation.sentry_profiles_sample_rate,
        environment=settings.environment,
        release=settings.instrumentation.sentry_release or os.getenv("SERVICE_VERSION"),
    )

logger = structlog.get_logger("api")

app = FastAPI(title="Fish Mouth AI API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = Path(__file__).resolve().parent / "static"
try:
    static_dir.mkdir(parents=True, exist_ok=True)
except Exception:
    pass
app.mount("/static", StaticFiles(directory=static_dir), name="static")

uploads_dir = Path(__file__).resolve().parent / "uploads"
try:
    uploads_dir.mkdir(parents=True, exist_ok=True)
except Exception:
    pass
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(health_router)
app.include_router(reports_router)
app.include_router(enhanced_reports_router)
app.include_router(contagion_router)
app.include_router(dashboard_router)
app.include_router(ai_voice_router)
app.include_router(webhooks_router)
app.include_router(branding_router)
app.include_router(mailers_router)
app.include_router(scan_jobs_router)
app.include_router(scans_router)
app.include_router(maps_router)
app.include_router(assets_router)
app.include_router(wallet_router)
app.include_router(events_router)
app.include_router(reports_render_router)
app.include_router(shares_router)
app.include_router(public_view_router)
app.include_router(shortlinks_router)
app.include_router(app_config_router)
app.include_router(activity_router)
app.include_router(sequences_api_router)
app.include_router(enrollments_api_router)
app.include_router(templates_router)
app.include_router(outbox_router)
app.include_router(growth_router)
app.include_router(geoip_router)
app.include_router(geo_router)
app.include_router(geo_guess_router)
app.include_router(marketing_router)
app.include_router(assistant_router)


app.middleware("http")(request_id_middleware_factory("X-Request-ID"))


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    request_id = (
        getattr(request.state, "request_id", None)
        or request.headers.get("X-Request-ID")
        or str(uuid.uuid4())
    )
    request.state.request_id = request_id
    bind_request_context(request_id=request_id)
    logger.info("request.received", method=request.method, path=str(request.url.path))
    try:
        response = await call_next(request)
    finally:
        clear_request_context()
    response.headers["X-Request-ID"] = request_id
    return response


def verify_telnyx_signature(request: Request, payload: dict) -> None:
    """Verify Telnyx webhook authenticity using Ed25519 or legacy HMAC."""

    providers = settings.providers
    timestamp = request.headers.get("Telnyx-Timestamp", "")
    if not timestamp:
        raise HTTPException(status_code=401, detail="Missing Telnyx timestamp header")

    serialized = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    message = f"{timestamp}|{serialized}".encode("utf-8")

    signature_ed25519 = request.headers.get("Telnyx-Signature-Ed25519")
    public_key_b64 = providers.telnyx_webhook_public_key
    if signature_ed25519 and public_key_b64:
        try:
            public_key = Ed25519PublicKey.from_public_bytes(base64.b64decode(public_key_b64))
            signature = base64.b64decode(signature_ed25519)
            public_key.verify(signature, message)
            return
        except (ValueError, InvalidSignature):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    secret = providers.telnyx_webhook_secret
    if secret:
        signature_hmac = request.headers.get("Telnyx-Signature-256")
        expected = hmac.new(secret.encode("utf-8"), message, digestmod="sha256").hexdigest()
        if not signature_hmac or not hmac.compare_digest(signature_hmac, expected):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")


def build_voice_call_config(db: Session, user_id: int) -> VoiceCallConfig:
    """Fetch persisted voice configuration for a user, falling back to defaults."""

    voice_config = (
        db.query(VoiceConfiguration)
        .filter(VoiceConfiguration.user_id == user_id)
        .first()
    )
    if not voice_config:
        voice_config = VoiceConfiguration(user_id=user_id)
        db.add(voice_config)
        db.commit()
        db.refresh(voice_config)

    return VoiceCallConfig(
        asr_vendor=voice_config.asr_vendor,
        tts_vendor=voice_config.tts_vendor,
        llm_vendor=voice_config.llm_vendor,
        voice_id=voice_config.default_voice_id,
        max_duration_minutes=voice_config.max_call_duration_minutes,
        enable_barge_in=voice_config.enable_barge_in,
        silence_timeout_seconds=voice_config.silence_timeout_seconds,
        confidence_threshold=voice_config.confidence_threshold,
    )


if settings.instrumentation.enable_prometheus:
    Instrumentator().instrument(app).expose(app, include_in_schema=False)


@app.on_event("startup")
async def on_startup() -> None:
    logger.info("app.startup", environment=settings.environment)
    if not settings.pii_encryption_key:
        logger.warning("security.pii_encryption_key_missing")
    if settings.environment.lower() == "production":
        insecure_flags = {
            "use_mock_imagery": settings.feature_flags.use_mock_imagery,
            "use_mock_property_enrichment": settings.feature_flags.use_mock_property_enrichment,
            "use_mock_contact_enrichment": settings.feature_flags.use_mock_contact_enrichment,
        }
        for flag, enabled in insecure_flags.items():
            if enabled:
                logger.warning("security.mock_flag_enabled", flag=flag)


@app.websocket("/ws/scans/{scan_id}")
async def scan_progress_websocket(websocket: WebSocket, scan_id: int) -> None:
    await websocket.accept()
    queue = await progress_notifier.register(scan_id)
    try:
        with SessionLocal() as db:
            area_scan = db.query(AreaScan).filter(AreaScan.id == scan_id).first()
            if area_scan:
                await websocket.send_json(
                    {
                        "id": area_scan.id,
                        "status": area_scan.status,
                        "processed_properties": area_scan.processed_properties,
                        "total_properties": area_scan.total_properties,
                        "qualified_leads": area_scan.qualified_leads,
                        "progress_percentage": area_scan.progress_percentage,
                        "results_summary": area_scan.results_summary,
                        "error_message": area_scan.error_message,
                        "started_at": area_scan.started_at.isoformat() if area_scan.started_at else None,
                        "completed_at": area_scan.completed_at.isoformat() if area_scan.completed_at else None,
                    }
                )

        while True:
            update = await queue.get()
            await websocket.send_json(update)
    except WebSocketDisconnect:
        logger.info("scan.progress.disconnect", scan_id=scan_id)
    finally:
        await progress_notifier.unregister(scan_id, queue)


@app.websocket("/ws/activity")
async def activity_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    queue = await activity_notifier.register()
    try:
        while True:
            message = await queue.get()
            await websocket.send_json(message)
    except WebSocketDisconnect:
        logger.info("activity_ws.disconnect")
    finally:
        await activity_notifier.unregister(queue)

# Pydantic models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    company_name: Optional[str] = None
    phone: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    radius_m: Optional[int] = Field(default=5000, ge=100)
    sample: Optional[int] = Field(default=1000, ge=1)

    class Config:
        extra = "ignore"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class UserResponse(BaseModel):
    id: int
    email: str
    company_name: Optional[str]
    phone: Optional[str]
    role: str
    is_active: bool

    class Config:
        from_attributes = True
class BusinessProfilePayload(BaseModel):
    company: Dict[str, Optional[str]]
    branding: Dict[str, Optional[str]]
    services: Dict[str, Optional[Dict]]
    caseStudies: Dict[str, Optional[List]] | Dict[str, Optional[Dict]] | Optional[Dict]
    aiAgent: Dict[str, Optional[Dict]]
    integrations: Dict[str, Optional[Dict]]



class GoogleLoginRequest(BaseModel):
    id_token: str


class MicrosoftLoginRequest(BaseModel):
    id_token: str


class AppleLoginRequest(BaseModel):
    id_token: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class SendVerificationRequest(BaseModel):
    email: EmailStr

# Lead Generation Models
class AreaScanCreate(BaseModel):
    area_name: str
    scan_type: str = "city"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_miles: Optional[float] = None
    estimated_cost: Optional[float] = None
    property_cap: Optional[int] = None

class ScanEstimateRequest(BaseModel):
    area_name: Optional[str] = None
    scan_type: str = "city"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    radius_miles: float = 1.0
    property_cap: Optional[int] = None

class ScanEstimateResponse(BaseModel):
    estimated_properties: int
    estimated_cost: float
    cost_breakdown: Dict[str, float]
    warnings: List[str]
    suggested_radius: Optional[float]
    estimated_properties_before_cap: int

class AreaScanResponse(BaseModel):
    id: int
    area_name: str
    scan_type: str
    status: str
    total_properties: int
    processed_properties: int
    qualified_leads: int
    progress_percentage: float
    results_summary: Optional[dict]
    scan_parameters: Optional[dict]
    created_at: str
    started_at: Optional[str]
    completed_at: Optional[str]

    class Config:
        from_attributes = True

class LeadResponse(BaseModel):
    id: int
    address: str
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    roof_age_years: Optional[int]
    roof_condition_score: Optional[float]
    roof_material: Optional[str]
    roof_size_sqft: Optional[int]
    aerial_image_url: Optional[str]
    lead_score: float
    priority: str
    replacement_urgency: Optional[str]
    damage_indicators: Optional[List[str]]
    discovery_status: str
    imagery_status: str
    property_enrichment_status: str
    contact_enrichment_status: str
    homeowner_name: Optional[str]
    homeowner_phone: Optional[str]
    homeowner_email: Optional[str]
    property_value: Optional[int]
    estimated_value: Optional[float]
    conversion_probability: Optional[float]
    ai_analysis: Optional[dict]
    image_quality_score: Optional[float] = None
    image_quality_issues: Optional[List[str]] = None
    quality_validation_status: Optional[str] = None
    street_view_quality: Optional[dict] = None
    roof_intelligence: Optional[dict] = None
    analysis_confidence: Optional[float] = None
    overlay_url: Optional[str] = None
    score_version: Optional[str] = None
    area_scan_id: Optional[int]
    status: str
    created_at: str
    voice_opt_out: Optional[bool] = False
    last_voice_contacted: Optional[str] = None

    class Config:
        from_attributes = True


class LeadActivityResponse(BaseModel):
    id: int
    lead_id: int
    activity_type: str
    title: str
    description: Optional[str]
    metadata: Optional[dict]
    created_at: str

    class Config:
        from_attributes = True

class ManualLeadPreferences(BaseModel):
    include_street_view: bool = True
    include_ai_brief: bool = True
    include_sales_assets: bool = True
    content_tier: Literal["standard", "premium", "maximal"] = "premium"


class ManualLeadRequest(BaseModel):
    address_line1: str = Field(..., min_length=1)
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    preferences: ManualLeadPreferences = Field(default_factory=ManualLeadPreferences)
    deliverables: Dict[str, bool] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    notes: Optional[str] = None


class ManualLeadResponse(BaseModel):
    lead: LeadResponse
    summary: Dict[str, Any]
    next_actions: List[str]
    activity_id: Optional[int] = None

class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None

class LeadFilter(BaseModel):
    priority: Optional[str] = None
    status: Optional[str] = None
    min_score: Optional[float] = None
    max_score: Optional[float] = None
    city: Optional[str] = None
    state: Optional[str] = None


def serialize_lead(lead: Lead) -> LeadResponse:
    return LeadResponse(
        id=lead.id,
        address=lead.address,
        city=lead.city,
        state=lead.state,
        zip_code=lead.zip_code,
        roof_age_years=lead.roof_age_years,
        roof_condition_score=lead.roof_condition_score,
        roof_material=lead.roof_material,
        roof_size_sqft=lead.roof_size_sqft,
        aerial_image_url=lead.aerial_image_url,
        lead_score=lead.lead_score,
        priority=lead.priority.value if lead.priority else LeadPriority.COLD.value,
        replacement_urgency=lead.replacement_urgency,
        damage_indicators=lead.damage_indicators,
        discovery_status=lead.discovery_status,
        imagery_status=lead.imagery_status,
        property_enrichment_status=lead.property_enrichment_status,
        contact_enrichment_status=lead.contact_enrichment_status,
        homeowner_name=lead.homeowner_name,
        homeowner_phone=lead.homeowner_phone,
        homeowner_email=lead.homeowner_email,
        property_value=lead.property_value,
        estimated_value=lead.estimated_value,
        conversion_probability=lead.conversion_probability,
        ai_analysis=lead.ai_analysis,
        image_quality_score=lead.image_quality_score,
        image_quality_issues=lead.image_quality_issues,
        quality_validation_status=lead.quality_validation_status,
        street_view_quality=lead.street_view_quality,
        roof_intelligence=lead.roof_intelligence,
        analysis_confidence=lead.analysis_confidence,
        overlay_url=lead.overlay_url,
        score_version=lead.score_version,
        area_scan_id=lead.area_scan_id,
        status=lead.status.value if lead.status else LeadStatus.NEW.value,
        created_at=lead.created_at.isoformat() if lead.created_at else datetime.utcnow().isoformat(),
        voice_opt_out=lead.voice_opt_out,
        last_voice_contacted=lead.last_voice_contacted.isoformat() if lead.last_voice_contacted else None,
    )

# Routes
@app.get("/")
async def root():
    return {"message": "Fish Mouth AI API", "status": "online"}

@app.post("/auth/signup", response_model=Token)
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user.password)
    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
        company_name=user.company_name,
        phone=user.phone,
        role="user",
        lead_credits=3,
        gift_credits_awarded=150,
        gift_leads_awarded=3,
        gift_awarded_at=datetime.utcnow(),
        onboarding_state={
            "welcome_shown": False,
            "steps_completed": [],
            "gift_summary": {
                "lead_credits": 3,
                "wallet_bonus": 150,
            },
        },
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    user_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"fishmouth-user-{new_user.id}")
    analytics_credits = max(new_user.gift_credits_awarded or 0, (new_user.lead_credits or 0) * 10)
    analytics_payload = {
        "user_id": str(user_uuid),
        "email": new_user.email,
        "credits": analytics_credits,
    }
    try:
        db.execute(
            text(
                """
                INSERT INTO analytics.users (user_id, email, credits)
                VALUES (:user_id, :email, :credits)
                ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
                """
            ),
            analytics_payload,
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception(
            "analytics.user_seed_failed",
            user_id=new_user.id,
            analytics_user_id=str(user_uuid),
            error=str(exc),
        )

    seed_lat = user.lat
    seed_lon = user.lon
    radius_m = user.radius_m or 5000
    sample_size = user.sample or 1000
    if seed_lat is not None and seed_lon is not None:
        seed_payload = {
            "user_id": str(user_uuid),
            "lat": float(seed_lat),
            "lon": float(seed_lon),
            "radius_m": int(radius_m),
            "sample": int(sample_size),
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    "http://onboarding_8034:8034/onboarding/seed",
                    json=seed_payload,
                )
            response.raise_for_status()
        except (httpx.HTTPError, ValueError) as exc:
            logger.exception(
                "onboarding.seed_failed",
                user_id=new_user.id,
                analytics_user_id=str(user_uuid),
                payload=seed_payload,
                error=str(exc),
            )
    else:
        logger.info(
            "onboarding.seed_skipped",
            user_id=new_user.id,
            analytics_user_id=str(user_uuid),
            reason="missing_coordinates",
        )
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "company_name": new_user.company_name,
            "role": new_user.role,
            "lead_credits": new_user.lead_credits,
            "gift_credits_awarded": new_user.gift_credits_awarded,
            "gift_leads_awarded": new_user.gift_leads_awarded,
            "gift_awarded_at": new_user.gift_awarded_at.isoformat() if new_user.gift_awarded_at else None,
            "analytics_user_id": str(user_uuid),
        }
    }

@app.post("/auth/login", response_model=Token)
async def login(user: UserLogin, db: Session = Depends(get_db)):
    # Find user
    db_user = db.query(User).filter(User.email == user.email).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
        detail="Inactive user"
    )
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    user_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"fishmouth-user-{db_user.id}")
    analytics_credits = max(db_user.gift_credits_awarded or 0, (db_user.lead_credits or 0) * 10)
    try:
        db.execute(
            text(
                """
                INSERT INTO analytics.users (user_id, email, credits)
                VALUES (:user_id, :email, :credits)
                ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email
                """
            ),
            {
                "user_id": str(user_uuid),
                "email": db_user.email,
                "credits": analytics_credits,
            },
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.exception(
            "analytics.user_ensure_failed",
            user_id=db_user.id,
            analytics_user_id=str(user_uuid),
            error=str(exc),
        )

    access_token = create_access_token(
        data={"sub": db_user.email}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "company_name": db_user.company_name,
            "phone": db_user.phone,
            "role": db_user.role,
            "lead_credits": db_user.lead_credits,
            "gift_credits_awarded": db_user.gift_credits_awarded,
            "gift_leads_awarded": db_user.gift_leads_awarded,
            "gift_awarded_at": db_user.gift_awarded_at.isoformat() if db_user.gift_awarded_at else None,
            "analytics_user_id": str(user_uuid),
        }
    }


@app.post("/auth/google", response_model=Token)
async def google_login(payload: GoogleLoginRequest, db: Session = Depends(get_db)):
    settings = get_settings()
    try:
        # Minimal verification: decode header/payload to extract email. In production, verify with Google.
        parts = payload.id_token.split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="Invalid ID token")
        import base64
        import json as _json
        def b64url_decode(data: str) -> bytes:
            padding = '=' * (-len(data) % 4)
            return base64.urlsafe_b64decode(data + padding)
        claims = _json.loads(b64url_decode(parts[1]).decode("utf-8"))
        email = claims.get("email")
        if not email:
            raise HTTPException(status_code=400, detail="Email not present in token")
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to parse Google token")

    # Find or create user
    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        db_user = User(email=email, hashed_password=get_password_hash(uuid.uuid4().hex), role="user")
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    if not db_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": db_user.email}, expires_delta=access_token_expires)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "company_name": db_user.company_name,
            "phone": db_user.phone,
            "role": db_user.role,
        },
    }


@app.post("/auth/microsoft", response_model=Token)
async def microsoft_login(payload: MicrosoftLoginRequest, db: Session = Depends(get_db)):
    # Minimal parse; for production validate sig with Microsoft OpenID configuration
    try:
        parts = payload.id_token.split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="Invalid ID token")
        import base64, json as _json
        def b64url_decode(data: str) -> bytes:
            padding = '=' * (-len(data) % 4)
            return base64.urlsafe_b64decode(data + padding)
        claims = _json.loads(b64url_decode(parts[1]).decode("utf-8"))
        email = claims.get("email") or claims.get("preferred_username")
        if not email:
            raise HTTPException(status_code=400, detail="Email not present in token")
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to parse Microsoft token")

    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        db_user = User(email=email, hashed_password=get_password_hash(uuid.uuid4().hex), role="user")
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    if not db_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": db_user.email}, expires_delta=access_token_expires)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "company_name": db_user.company_name,
            "phone": db_user.phone,
            "role": db_user.role,
        },
    }


@app.post("/auth/apple", response_model=Token)
async def apple_login(payload: AppleLoginRequest, db: Session = Depends(get_db)):
    # Parse Apple identity token (JWT). For production, validate signature against Apple's JWKS.
    try:
        parts = payload.id_token.split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=400, detail="Invalid ID token")

        import base64
        import json as _json

        def b64url_decode(data: str) -> bytes:
            padding = '=' * (-len(data) % 4)
            return base64.urlsafe_b64decode(data + padding)

        claims = _json.loads(b64url_decode(parts[1]).decode("utf-8"))
        email = claims.get("email")
        if not email:
            sub = claims.get("sub")
            if not sub:
                raise HTTPException(status_code=400, detail="Email not present in token")
            email = f"{sub}@appleid.apple.com"
        email = email.lower()
        name_claim = claims.get("name")
        if isinstance(name_claim, dict):
            full_name = " ".join(filter(None, [name_claim.get("firstName"), name_claim.get("lastName")])).strip()
            full_name = full_name or None
        else:
            full_name = str(name_claim).strip() if name_claim else None
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to parse Apple token")

    db_user = db.query(User).filter(User.email == email).first()
    if not db_user:
        db_user = User(
            email=email,
            hashed_password=get_password_hash(uuid.uuid4().hex),
            role="user",
            full_name=full_name,
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)

    if not db_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": db_user.email}, expires_delta=access_token_expires)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "company_name": db_user.company_name,
            "phone": db_user.phone,
            "role": db_user.role,
        },
    }


@app.post("/auth/request-password-reset")
async def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always return success to avoid account enumeration
    if user:
        # Issue a short-lived reset token (JWT) with purpose marker
        expires = timedelta(minutes=30)
        reset_token = create_access_token(data={"sub": user.email, "purpose": "password_reset"}, expires_delta=expires)
        # Send transactional email if configured
        try:
            adapters = get_delivery_adapters()
            base_url = str(settings.frontend_url) if settings.frontend_url else "http://localhost:3000"
            link = f"{base_url.rstrip('/')}/reset-password?token={reset_token}"
            subject = "Reset your Fish Mouth password"
            body = (
                "We received a request to reset your Fish Mouth password.\n\n"
                f"Use this secure link within 30 minutes: {link}\n\n"
                "If you did not request this, you can ignore this email."
            )
            # no await on adapters if not async; adapter is async
            import asyncio
            if asyncio.iscoroutinefunction(adapters.email.send_email):
                await adapters.email.send_email(user.email, subject, body, {"type": "password_reset"})
            else:
                adapters.email.send_email(user.email, subject, body, {"type": "password_reset"})
        except Exception as exc:
            logger.warning("password.reset.email_failed", error=str(exc))
        logger.info("password.reset.link", email=user.email, token=reset_token)
    return {"status": "ok"}


@app.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    from auth import SECRET_KEY, ALGORITHM
    try:
        decoded = jwt.decode(payload.token, SECRET_KEY, algorithms=[ALGORITHM])
        if decoded.get("purpose") != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid reset token")
        email = decoded.get("sub")
        if not email:
            raise HTTPException(status_code=400, detail="Invalid reset token")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        # Do not reveal existence
        return {"status": "ok"}

    if not payload.new_password or len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    user.hashed_password = get_password_hash(payload.new_password)
    db.add(user)
    db.commit()
    logger.info("password.reset.success", email=email)
    return {"status": "ok"}


@app.post("/auth/send-verification")
async def send_verification(payload: SendVerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    # Always succeed (avoid enumeration)
    if user:
        expires = timedelta(hours=24)
        verification_token = create_access_token(data={"sub": user.email, "purpose": "verify_email"}, expires_delta=expires)
        try:
            adapters = get_delivery_adapters()
            base_url = str(settings.frontend_url) if settings.frontend_url else "http://localhost:3000"
            link = f"{base_url.rstrip('/')}/verify-email?token={verification_token}"
            subject = "Verify your Fish Mouth email"
            body = (
                "Welcome to Fish Mouth!\n\n"
                f"Confirm your email address by clicking: {link}\n\n"
                "This link expires in 24 hours."
            )
            import asyncio
            if asyncio.iscoroutinefunction(adapters.email.send_email):
                await adapters.email.send_email(user.email, subject, body, {"type": "verify_email"})
            else:
                adapters.email.send_email(user.email, subject, body, {"type": "verify_email"})
        except Exception as exc:
            logger.warning("email.verify.email_failed", error=str(exc))
        logger.info("email.verify.link", email=user.email, token=verification_token)
    return {"status": "ok"}


@app.get("/auth/verify-email")
async def verify_email(token: str, db: Session = Depends(get_db)):
    from auth import SECRET_KEY, ALGORITHM
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if decoded.get("purpose") != "verify_email":
            raise HTTPException(status_code=400, detail="Invalid verification token")
        email = decoded.get("sub")
        if not email:
            raise HTTPException(status_code=400, detail="Invalid verification token")
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        return {"status": "ok"}
    user.is_active = True
    db.add(user)
    db.commit()
    logger.info("email.verify.success", email=email)
    return {"status": "ok"}


@app.post("/api/uploads")
async def upload_file(file: UploadFile = File(...)):
    """Accept a file upload and return a public URL under /uploads."""
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    # sanitize filename minimally
    import re, uuid
    suffix = Path(file.filename).suffix.lower()
    safe_suffix = suffix if re.match(r"^\.[a-z0-9]{1,6}$", suffix) else ""
    filename = f"{uuid.uuid4().hex}{safe_suffix}"
    destination = uploads_dir / filename
    try:
        with destination.open("wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {exc}")
    return {"url": f"/uploads/{filename}", "filename": filename}

@app.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@app.get("/api/business/profile")
async def get_business_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    if not contractor:
        return {
            "company": {
                "name": current_user.company_name,
                "phone": current_user.phone,
                "email": current_user.email,
                "website": contractor.website if contractor else None,
                "address": contractor.address if contractor else None,
            },
            "branding": {
                "primaryColor": (contractor.brand_palette or {}).get("primary") if contractor and contractor.brand_palette else None,
                "secondaryColor": (contractor.brand_palette or {}).get("secondary") if contractor and contractor.brand_palette else None,
                "accentColor": (contractor.brand_palette or {}).get("accent") if contractor and contractor.brand_palette else None,
                "logo": contractor.logo_url if contractor else None,
              },
            "services": {},
            "caseStudies": {"portfolio": [], "testimonials": [], "beforeAfterSets": []},
            "aiAgent": {},
            "integrations": {},
        }
    palette = contractor.brand_palette or {}
    return {
        "company": {
            "name": contractor.company_name or current_user.company_name,
            "phone": contractor.phone or current_user.phone,
            "email": current_user.email,
            "website": contractor.website,
            "address": contractor.address,
        },
        "branding": {
            "primaryColor": palette.get("primary"),
            "secondaryColor": palette.get("secondary"),
            "accentColor": palette.get("accent"),
            "logo": contractor.logo_url,
        },
        "services": {},
        "caseStudies": {"portfolio": [], "testimonials": [], "beforeAfterSets": []},
        "aiAgent": {},
        "integrations": {},
    }


@app.post("/api/business/profile")
async def save_business_profile(payload: BusinessProfilePayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    if not contractor:
        contractor = Contractor(user_id=current_user.id)
        db.add(contractor)
    company = payload.company or {}
    branding = payload.branding or {}
    contractor.company_name = company.get("name") or contractor.company_name or current_user.company_name
    contractor.phone = company.get("phone") or contractor.phone or current_user.phone
    contractor.website = company.get("website") or contractor.website
    contractor.address = company.get("address") or contractor.address
    if branding:
        contractor.brand_palette = {
            "primary": branding.get("primaryColor"),
            "secondary": branding.get("secondaryColor"),
            "accent": branding.get("accentColor"),
        }
        if branding.get("logo"):
            contractor.logo_url = branding.get("logo")
    db.commit()
    db.refresh(contractor)
    return {"status": "saved"}


# -------------------- Business Settings: Services/Pricing/Autofill --------------------

class BusinessSettingsPayload(BaseModel):
    services_config: dict | None = None
    service_areas: dict | None = None
    offers_packages: dict | None = None
    content_library: dict | None = None
    completeness: dict | None = None


@app.get("/api/business/settings")
async def get_business_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    if not contractor:
        return {
            "services_config": {},
            "service_areas": {},
            "offers_packages": {},
            "completeness": {"missing_count": 0, "by_section": {}},
            "autofill_status": "idle",
            "last_scraped_at": None,
            "pricing_suggestions": {},
        }
    return {
        "services_config": contractor.services_config or {},
        "service_areas": contractor.service_areas or {},
        "offers_packages": contractor.offers_packages or {},
        "completeness": contractor.completeness or {"missing_count": 0, "by_section": {}},
        "autofill_status": contractor.autofill_status or "idle",
        "last_scraped_at": contractor.last_scraped_at.isoformat() if contractor.last_scraped_at else None,
        "pricing_suggestions": contractor.pricing_suggestions or {},
    }


@app.put("/api/business/settings")
async def put_business_settings(payload: BusinessSettingsPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    if not contractor:
        contractor = Contractor(user_id=current_user.id)
        db.add(contractor)
    if payload.services_config is not None:
        contractor.services_config = payload.services_config
    if payload.service_areas is not None:
        contractor.service_areas = payload.service_areas
    if payload.offers_packages is not None:
        contractor.offers_packages = payload.offers_packages
    if payload.content_library is not None:
        contractor.content_library = payload.content_library
    if payload.completeness is not None:
        contractor.completeness = payload.completeness
    db.commit()
    return {"status": "saved"}


class AutofillRequest(BaseModel):
    website_url: str


@app.post("/api/business/settings/autofill")
async def start_business_autofill(payload: AutofillRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    if not contractor:
        contractor = Contractor(user_id=current_user.id)
        db.add(contractor)
    contractor.autofill_status = "running"
    db.commit()
    # Kick off external scraper service (fire-and-forget best effort)
    try:
        import httpx
        from datetime import datetime
        scraper_url = "http://localhost:8011/scrape"
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(scraper_url, json={"url": payload.website_url, "scrape_type": "contractor"})
            data = resp.json() if resp.status_code == 200 else {"success": False}
        harvested = data.get("data") or {}
        contractor.services_config = contractor.services_config or {}
        contractor.service_areas = contractor.service_areas or {}
        contractor.offers_packages = contractor.offers_packages or {}
        # naive mapping for MVP
        if isinstance(harvested, dict):
            services = harvested.get("services") or harvested.get("service_list") or []
            testimonials = harvested.get("testimonials") or []
            contractor.services_config.update({"items": services})
            contractor.completeness = contractor.completeness or {"missing_count": 0, "by_section": {}}
            contractor.completeness["by_section"] = {**contractor.completeness.get("by_section", {}), "portfolio": {"testimonials": len(testimonials)}}
        contractor.last_scraped_at = datetime.utcnow()
        contractor.autofill_status = "done"
        db.commit()
    except Exception:
        contractor.autofill_status = "error"
        db.commit()
    return {"status": contractor.autofill_status}


@app.get("/api/business/settings/autofill/status")
async def business_autofill_status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    return {
        "autofill_status": contractor.autofill_status if contractor else "idle",
        "last_scraped_at": contractor.last_scraped_at.isoformat() if contractor and contractor.last_scraped_at else None,
    }


class ApplySuggestionsPayload(BaseModel):
    state: str | None = None
    services: list[dict] | None = None
    accept: list[str] | None = None  # ids/names to apply


@app.post("/api/business/settings/apply-suggestions")
async def apply_suggestions(payload: ApplySuggestionsPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    if not contractor:
        contractor = Contractor(user_id=current_user.id)
        db.add(contractor)

    # compute suggestions
    from app.services.pricing_suggester import suggest_price_ranges
    suggestions = suggest_price_ranges(
        (payload.state or "").upper(), payload.services or (contractor.services_config or {}).get("items", [])
    )
    contractor.pricing_suggestions = suggestions

    # Optionally apply selected to services_config
    to_accept = set(payload.accept or [])
    if to_accept:
        items = (contractor.services_config or {}).get("items", [])
        new_items = []
        for item in items:
            sid = str(item.get("id") or item.get("name") or "")
            if sid in to_accept and sid in suggestions:
                sug = suggestions[sid]
                item = {
                    **item,
                    "suggested_min": sug["suggested_min"],
                    "suggested_max": sug["suggested_max"],
                    "unit": item.get("unit") or sug.get("unit") or "project",
                }
            new_items.append(item)
        contractor.services_config = {**(contractor.services_config or {}), "items": new_items}

    db.commit()
    return {"status": "ok", "suggestions": suggestions}

@app.get("/admin/dashboard")
async def admin_dashboard(current_user: User = Depends(get_current_admin), db: Session = Depends(get_db)):
    total_users = db.query(User).filter(User.role == "user").count()
    total_scans = db.query(AreaScan).count()
    total_leads = db.query(Lead).count()
    
    recent_users = (
        db.query(User)
        .filter(User.role == "user")
        .order_by(User.created_at.desc())
        .limit(8)
        .all()
    )

    recent_scans = (
        db.query(AreaScan)
        .order_by(AreaScan.created_at.desc())
        .limit(10)
        .all()
    )
    
    return {
        "stats": {
            "total_users": total_users,
            "total_scans": total_scans,
            "total_leads": total_leads,
            "active_users": db.query(User).filter(User.is_active == True, User.role == "user").count(),
            "trial_users": db.query(User).filter(User.subscription_tier == "trial").count(),
        },
        "recent_users": [
            {
                "id": user.id,
                "email": user.email,
                "company_name": user.company_name,
                "subscription_tier": user.subscription_tier,
                "created_at": user.created_at.isoformat(),
            }
            for user in recent_users
        ],
        "recent_scans": [
            {
                "id": scan.id,
                "area_name": scan.area_name,
                "status": scan.status,
                "qualified_leads": scan.qualified_leads,
                "created_at": scan.created_at.isoformat(),
                "results_summary": scan.results_summary,
            }
            for scan in recent_scans
        ],
    }

# Lead Generation Endpoints

@app.post("/api/scan/estimate", response_model=ScanEstimateResponse)
async def estimate_scan_cost(payload: ScanEstimateRequest) -> ScanEstimateResponse:
    """Estimate property volume and API spend prior to launching an area scan."""
    radius = max(payload.radius_miles or 0.5, 0.25)
    scan_type = payload.scan_type or "city"

    density = 165 if scan_type == "city" else 120
    estimated_properties_before_cap = int(round(density * (radius ** 2)))
    property_cap = payload.property_cap or settings.property_discovery_limit
    estimated_properties = min(estimated_properties_before_cap, property_cap)

    imagery_cost = round(estimated_properties * 0.45, 2)
    street_view_cost = round(estimated_properties * 0.28, 2)
    enrichment_cost = round(estimated_properties * 0.22, 2)
    processing_cost = round(estimated_properties * 0.12, 2)
    total_cost = round(imagery_cost + street_view_cost + enrichment_cost + processing_cost, 2)

    warnings: List[str] = []
    if radius > 3.0:
        warnings.append("Scanning beyond a 3 mile radius can generate excessive API spend.")
    if estimated_properties_before_cap > property_cap:
        warnings.append(f"Only the first {property_cap} properties will be processed due to the configured cap.")
    if total_cost > 400:
        warnings.append("Projected spend exceeds $400. Consider narrowing the radius or adjusting the cap.")

    suggested_radius: Optional[float] = None
    if total_cost > 400:
        reduction_ratio = 400 / total_cost
        suggested_radius = round(radius * (reduction_ratio ** 0.5), 2)

    return ScanEstimateResponse(
        estimated_properties=estimated_properties,
        estimated_properties_before_cap=estimated_properties_before_cap,
        estimated_cost=total_cost,
        cost_breakdown={
            "imagery": imagery_cost,
            "street_view": street_view_cost,
            "data_enrichment": enrichment_cost,
            "processing": processing_cost,
        },
        warnings=warnings,
        suggested_radius=suggested_radius,
    )

@app.post("/api/scan/area", response_model=AreaScanResponse)
async def start_area_scan(
    scan_data: AreaScanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new area scan for lead generation"""
    lead_service = LeadGenerationService(db)
    
    area_scan = await lead_service.start_area_scan(
        user_id=current_user.id,
        area_name=scan_data.area_name,
        scan_type=scan_data.scan_type,
        scan_parameters={
            "latitude": scan_data.latitude,
            "longitude": scan_data.longitude,
            "radius_miles": scan_data.radius_miles,
            "estimated_cost": scan_data.estimated_cost,
            "property_cap": scan_data.property_cap,
        },
    )
    
    return AreaScanResponse(
        id=area_scan.id,
        area_name=area_scan.area_name,
        scan_type=area_scan.scan_type,
        status=area_scan.status,
        total_properties=area_scan.total_properties,
        processed_properties=area_scan.processed_properties,
        qualified_leads=area_scan.qualified_leads,
        progress_percentage=area_scan.progress_percentage,
        results_summary=area_scan.results_summary,
        scan_parameters=area_scan.scan_parameters,
        created_at=area_scan.created_at.isoformat(),
        started_at=area_scan.started_at.isoformat() if area_scan.started_at else None,
        completed_at=area_scan.completed_at.isoformat() if area_scan.completed_at else None
    )

@app.get("/api/scan/{scan_id}/status", response_model=AreaScanResponse)
async def get_scan_status(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the current status of an area scan"""
    lead_service = LeadGenerationService(db)
    
    area_scan = lead_service.get_scan_status(scan_id)
    if not area_scan or area_scan.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    return AreaScanResponse(
        id=area_scan.id,
        area_name=area_scan.area_name,
        scan_type=area_scan.scan_type,
        status=area_scan.status,
        total_properties=area_scan.total_properties,
        processed_properties=area_scan.processed_properties,
        qualified_leads=area_scan.qualified_leads,
        progress_percentage=area_scan.progress_percentage,
        results_summary=area_scan.results_summary,
        scan_parameters=area_scan.scan_parameters,
        created_at=area_scan.created_at.isoformat(),
        started_at=area_scan.started_at.isoformat() if area_scan.started_at else None,
        completed_at=area_scan.completed_at.isoformat() if area_scan.completed_at else None
    )

@app.get("/api/scan/{scan_id}/results", response_model=List[LeadResponse])
async def get_scan_results(
    scan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the leads generated from a scan"""
    lead_service = LeadGenerationService(db)
    
    leads = lead_service.get_scan_results(scan_id, current_user.id)
    
    return [
        LeadResponse(
            id=lead.id,
            address=lead.address,
            city=lead.city,
            state=lead.state,
            zip_code=lead.zip_code,
            roof_age_years=lead.roof_age_years,
            roof_condition_score=lead.roof_condition_score,
            roof_material=lead.roof_material,
            roof_size_sqft=lead.roof_size_sqft,
            aerial_image_url=lead.aerial_image_url,
            lead_score=lead.lead_score,
            priority=lead.priority.value if lead.priority else "cold",
            replacement_urgency=lead.replacement_urgency,
            damage_indicators=lead.damage_indicators,
            discovery_status=lead.discovery_status,
            imagery_status=lead.imagery_status,
            property_enrichment_status=lead.property_enrichment_status,
            contact_enrichment_status=lead.contact_enrichment_status,
            homeowner_name=lead.homeowner_name,
            homeowner_phone=lead.homeowner_phone,
            homeowner_email=lead.homeowner_email,
            property_value=lead.property_value,
            estimated_value=lead.estimated_value,
            conversion_probability=lead.conversion_probability,
            ai_analysis=lead.ai_analysis,
            image_quality_score=lead.image_quality_score,
            image_quality_issues=lead.image_quality_issues,
            quality_validation_status=lead.quality_validation_status,
            street_view_quality=lead.street_view_quality,
            roof_intelligence=lead.roof_intelligence,
            analysis_confidence=lead.analysis_confidence,
            overlay_url=lead.overlay_url,
            score_version=lead.score_version,
            area_scan_id=lead.area_scan_id,
            status=lead.status.value if lead.status else "new",
            created_at=lead.created_at.isoformat(),
            voice_opt_out=lead.voice_opt_out,
            last_voice_contacted=lead.last_voice_contacted.isoformat() if lead.last_voice_contacted else None,
        )
        for lead in leads
    ]

@app.post("/api/leads/manual", response_model=ManualLeadResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_lead(
    payload: ManualLeadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = LeadGenerationService(db)
    try:
        result = await service.generate_manual_lead(
            current_user.id,
            address_line1=payload.address_line1,
            address_line2=payload.address_line2,
            city=payload.city,
            state=payload.state,
            postal_code=payload.postal_code,
            latitude=payload.latitude,
            longitude=payload.longitude,
            include_street_view=payload.preferences.include_street_view,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception(
            "manual_lead.failed",
            user_id=current_user.id,
            address=payload.address_line1,
            error=str(exc),
        )
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate lead") from exc

    lead = result.lead

    new_tags = set(lead.tags or [])
    new_tags.add("manual_add")
    for tag in payload.tags:
        normalized = tag.strip()
        if normalized:
            new_tags.add(normalized.lower())
    tier_tag = payload.preferences.content_tier
    if tier_tag:
        new_tags.add(f"manual_tier:{tier_tag}")
    lead.tags = sorted(new_tags)

    if payload.notes:
        trimmed = payload.notes.strip()
        if trimmed:
            existing = (lead.notes or "").strip()
            lead.notes = f"{existing}\n{trimmed}" if existing else trimmed

    activity_metadata = result.activity.metadata or {}
    activity_metadata["manual_preferences"] = {
        "deliverables": payload.deliverables,
        "content_tier": payload.preferences.content_tier,
        "include_street_view": payload.preferences.include_street_view,
        "include_ai_brief": payload.preferences.include_ai_brief,
        "include_sales_assets": payload.preferences.include_sales_assets,
    }
    result.activity.metadata = activity_metadata

    db.commit()
    db.refresh(lead)
    db.refresh(result.activity)

    summary = {
        "address": lead.address,
        "lead_score": lead.lead_score,
        "priority": lead.priority.value if lead.priority else LeadPriority.COLD.value,
        "quality_status": result.quality_status,
        "roof_age_years": lead.roof_age_years,
        "analysis_summary": result.analysis.summary,
        "replacement_urgency": result.analysis.replacement_urgency,
        "damage_indicators": lead.damage_indicators or [],
        "imagery_source": lead.imagery_status,
        "contact_confidence": result.contact_profile.confidence,
        "property_value": lead.property_value,
        "deliverables": payload.deliverables,
        "content_tier": payload.preferences.content_tier,
        "street_view_requested": payload.preferences.include_street_view,
    }

    next_actions: List[str] = []
    priority_value = lead.priority or LeadPriority.COLD
    if priority_value == LeadPriority.HOT:
        next_actions.extend(
            [
                "Enroll in AI follow-up sequence for immediate outreach.",
                "Send premium homeowner dossier with hail findings.",
            ]
        )
    elif priority_value == LeadPriority.WARM:
        next_actions.extend(
            [
                "Queue nurture sequence with insurance education touchpoints.",
                "Schedule a field inspection within 72 hours.",
            ]
        )
    else:
        next_actions.extend(
            [
                "Add to watchlist and schedule a personalized check-in.",
                "Run localized mail or door hanger campaign within 7 days.",
            ]
        )

    if payload.preferences.include_ai_brief:
        next_actions.append("Review AI brief and tailor talking points for homeowner call.")

    if payload.preferences.include_sales_assets:
        next_actions.append("Attach new imagery to your proposal deck for this property.")

    return ManualLeadResponse(
        lead=serialize_lead(lead),
        summary=summary,
        next_actions=next_actions,
        activity_id=result.activity.id,
    )


@app.get("/api/leads", response_model=List[LeadResponse])
async def get_leads(
    priority: Optional[str] = None,
    status: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    area_scan_id: Optional[int] = None,
    limit: Optional[int] = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get leads with optional filtering"""
    query = db.query(Lead).filter(Lead.user_id == current_user.id)
    
    if priority:
        query = query.filter(Lead.priority == priority)
    if status:
        query = query.filter(Lead.status == status)
    if min_score is not None:
        query = query.filter(Lead.lead_score >= min_score)
    if max_score is not None:
        query = query.filter(Lead.lead_score <= max_score)
    if area_scan_id is not None:
        query = query.filter(Lead.area_scan_id == area_scan_id)
    
    if area_scan_id is not None:
        query = query.filter(Lead.area_scan_id == area_scan_id)

    leads = query.order_by(Lead.lead_score.desc()).limit(limit).all()
    
    return [serialize_lead(lead) for lead in leads]


@app.get("/api/leads/export")
async def export_leads(
    priority: Optional[str] = None,
    status: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export user leads to CSV."""
    query = db.query(Lead).filter(Lead.user_id == current_user.id)

    if priority:
        query = query.filter(Lead.priority == priority)
    if status:
        query = query.filter(Lead.status == status)
    if min_score is not None:
        query = query.filter(Lead.lead_score >= min_score)
    if max_score is not None:
        query = query.filter(Lead.lead_score <= max_score)

    leads = query.order_by(Lead.lead_score.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "lead_id",
        "address",
        "city",
        "state",
        "zip_code",
        "lead_score",
        "priority",
        "roof_age_years",
        "roof_condition_score",
        "replacement_urgency",
        "homeowner_name",
        "homeowner_phone",
        "homeowner_email",
        "property_value",
        "estimated_value",
        "conversion_probability",
        "damage_indicators",
        "image_quality_score",
        "quality_validation_status",
        "analysis_confidence",
        "score_version",
        "overlay_url",
        "area_scan_id",
        "created_at",
    ])

    for lead in leads:
        email = lead.homeowner_email or decrypt_value(lead.homeowner_email_encrypted)
        phone = lead.homeowner_phone or decrypt_value(lead.homeowner_phone_encrypted)
        writer.writerow([
            lead.id,
            lead.address,
            lead.city,
            lead.state,
            lead.zip_code,
            lead.lead_score,
            lead.priority.value if lead.priority else None,
            lead.roof_age_years,
            lead.roof_condition_score,
            lead.replacement_urgency,
            lead.homeowner_name,
            phone,
            email,
            lead.property_value,
            lead.estimated_value,
            lead.conversion_probability,
            "; ".join(lead.damage_indicators or []),
            lead.image_quality_score,
            lead.quality_validation_status,
            lead.analysis_confidence,
            lead.score_version,
            lead.overlay_url,
            lead.area_scan_id,
            lead.created_at.isoformat(),
        ])

    output.seek(0)
    filename = f"fishmouth-leads-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

@app.get("/api/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific lead"""
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.user_id == current_user.id
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    email = lead.homeowner_email or decrypt_value(lead.homeowner_email_encrypted)
    phone = lead.homeowner_phone or decrypt_value(lead.homeowner_phone_encrypted)
    base = serialize_lead(lead)
    return base.copy(
        update={
            "homeowner_email": email,
            "homeowner_phone": phone,
        }
    )


@app.get("/api/leads/{lead_id}/sequences")
async def get_lead_sequences(
    lead_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Return all sequence enrollments for the specified lead."""
    from models import SequenceEnrollment, Sequence

    lead = db.query(Lead).filter(Lead.id == lead_id, Lead.user_id == current_user.id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    enrollments = (
        db.query(SequenceEnrollment)
        .join(Sequence, Sequence.id == SequenceEnrollment.sequence_id)
        .filter(
            SequenceEnrollment.lead_id == lead_id,
            SequenceEnrollment.user_id == current_user.id,
        )
        .order_by(SequenceEnrollment.enrolled_at.desc())
        .all()
    )

    return [
        {
            "id": enrollment.id,
            "sequence_id": enrollment.sequence_id,
            "sequence_name": enrollment.sequence.name,
            "status": enrollment.status,
            "current_node_id": enrollment.current_node_id,
            "next_execution_at": enrollment.next_execution_at.isoformat() if enrollment.next_execution_at else None,
            "completed_at": enrollment.completed_at.isoformat() if enrollment.completed_at else None,
            "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
            "conversion_outcome": enrollment.conversion_outcome,
        }
        for enrollment in enrollments
    ]


@app.get("/api/activities", response_model=List[LeadActivityResponse])
async def get_activities(
    limit: int = 50,
    lead_id: Optional[int] = None,
    activity_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch recent AI-driven activities for the current user."""
    query = (
        db.query(LeadActivity)
        .join(Lead, LeadActivity.lead_id == Lead.id)
        .filter(Lead.user_id == current_user.id)
        .order_by(LeadActivity.created_at.desc())
    )

    if lead_id:
        query = query.filter(LeadActivity.lead_id == lead_id)
    if activity_type:
        query = query.filter(LeadActivity.activity_type == activity_type)

    activities = query.limit(min(limit, 200)).all()

    return [
        LeadActivityResponse(
            id=activity.id,
            lead_id=activity.lead_id,
            activity_type=activity.activity_type,
            title=activity.title,
            description=activity.description,
            metadata=activity.activity_metadata,
            created_at=activity.created_at.isoformat(),
        )
        for activity in activities
    ]

@app.put("/api/leads/{lead_id}")
async def update_lead(
    lead_id: int,
    lead_update: LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a lead's information"""
    lead = db.query(Lead).filter(
        Lead.id == lead_id,
        Lead.user_id == current_user.id
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    if lead_update.status:
        lead.status = lead_update.status
    if lead_update.notes:
        lead.notes = lead_update.notes
    if lead_update.tags:
        lead.tags = lead_update.tags
    record_audit_event(
        db,
        user_id=current_user.id,
        action="lead.update",
        entity="lead",
        entity_id=lead_id,
        metadata={
            "status": lead_update.status.value if lead_update.status else None,
            "tags": lead_update.tags,
        },
    )
    db.commit()
    
    return {"message": "Lead updated successfully"}

@app.get("/api/scans")
async def get_area_scans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's area scans"""
    scans = db.query(AreaScan).filter(AreaScan.user_id == current_user.id).order_by(AreaScan.created_at.desc()).all()
    
    return [
        AreaScanResponse(
            id=scan.id,
            area_name=scan.area_name,
            scan_type=scan.scan_type,
            status=scan.status,
            total_properties=scan.total_properties,
            processed_properties=scan.processed_properties,
            qualified_leads=scan.qualified_leads,
            progress_percentage=scan.progress_percentage,
            results_summary=scan.results_summary,
            created_at=scan.created_at.isoformat(),
            started_at=scan.started_at.isoformat() if scan.started_at else None,
            completed_at=scan.completed_at.isoformat() if scan.completed_at else None
        )
        for scan in scans
    ]

# Dashboard Analytics Endpoint
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics"""
    total_leads = db.query(Lead).filter(Lead.user_id == current_user.id).count()
    hot_leads = db.query(Lead).filter(
        Lead.user_id == current_user.id,
        Lead.priority == LeadPriority.HOT
    ).count()
    warm_leads = db.query(Lead).filter(
        Lead.user_id == current_user.id,
        Lead.priority == LeadPriority.WARM
    ).count()
    
    # Calculate average lead score
    leads = db.query(Lead).filter(Lead.user_id == current_user.id).all()
    avg_score = sum(lead.lead_score for lead in leads) / len(leads) if leads else 0
    
    # Recent scans
    recent_scans = db.query(AreaScan).filter(
        AreaScan.user_id == current_user.id
    ).order_by(AreaScan.created_at.desc()).limit(5).all()
    
    return {
        "total_leads": total_leads,
        "hot_leads": hot_leads,
        "warm_leads": warm_leads,
        "cold_leads": total_leads - hot_leads - warm_leads,
        "average_lead_score": round(avg_score, 1),
        "recent_scans": [
            {
                "id": scan.id,
                "area_name": scan.area_name,
                "status": scan.status,
                "qualified_leads": scan.qualified_leads,
                "created_at": scan.created_at.isoformat()
            }
            for scan in recent_scans
        ]
    }

# Sequence API Endpoints
class SequenceCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    template_name: Optional[str] = None

class SequenceUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    flow_data: Optional[dict] = None

class SequenceEnrollRequest(BaseModel):
    lead_ids: List[int]


class SequenceEnrollmentUpdateRequest(BaseModel):
    action: Optional[str] = None  # pause, resume, cancel, mark_converted, mark_failed
    notes: Optional[str] = None

@app.get("/api/sequences")
async def get_sequences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sequences for the current user"""
    from models import Sequence
    
    sequences = db.query(Sequence).filter(
        Sequence.user_id == current_user.id
    ).order_by(Sequence.created_at.desc()).all()
    
    return [
        {
            "id": seq.id,
            "name": seq.name,
            "description": seq.description,
            "is_active": seq.is_active,
            "is_template": seq.is_template,
            "total_enrolled": seq.total_enrolled,
            "total_completed": seq.total_completed,
            "total_converted": seq.total_converted,
            "conversion_rate": seq.conversion_rate,
            "flow_data": seq.flow_data,
            "created_at": seq.created_at.isoformat(),
            "updated_at": seq.updated_at.isoformat()
        }
        for seq in sequences
    ]

@app.post("/api/sequences")
async def create_sequence(
    request: SequenceCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new sequence"""
    if request.template_name:
        # Create from template
        sequence = SequenceService.create_sequence_from_template(
            request.template_name, current_user.id, db
        )
    else:
        # Create blank sequence
        from models import Sequence
        sequence = Sequence(
            user_id=current_user.id,
            name=request.name,
            description=request.description,
            flow_data={
                "nodes": [
                    {
                        "id": "start",
                        "type": "start",
                        "position": {"x": 100, "y": 100},
                        "data": {"label": "Start"}
                    },
                    {
                        "id": "end_default",
                        "type": "end",
                        "position": {"x": 320, "y": 100},
                        "data": {"label": "Sequence Complete", "outcome": "completed"}
                    }
                ],
                "edges": []
            }
        )
        db.add(sequence)
        db.commit()
        db.refresh(sequence)
    
    return {
        "id": sequence.id,
        "name": sequence.name,
        "description": sequence.description,
        "is_active": sequence.is_active,
        "flow_data": sequence.flow_data,
        "created_at": sequence.created_at.isoformat()
    }

@app.get("/api/sequences/{sequence_id}")
async def get_sequence(
    sequence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific sequence"""
    from models import Sequence
    
    sequence = db.query(Sequence).filter(
        Sequence.id == sequence_id,
        Sequence.user_id == current_user.id
    ).first()
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    return {
        "id": sequence.id,
        "name": sequence.name,
        "description": sequence.description,
        "is_active": sequence.is_active,
        "is_template": sequence.is_template,
        "flow_data": sequence.flow_data,
        "total_enrolled": sequence.total_enrolled,
        "total_completed": sequence.total_completed,
        "total_converted": sequence.total_converted,
        "conversion_rate": sequence.conversion_rate,
        "working_hours_start": sequence.working_hours_start,
        "working_hours_end": sequence.working_hours_end,
        "working_days": sequence.working_days,
        "timezone": sequence.timezone,
        "created_at": sequence.created_at.isoformat(),
        "updated_at": sequence.updated_at.isoformat()
    }

@app.put("/api/sequences/{sequence_id}")
async def update_sequence(
    sequence_id: int,
    request: SequenceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a sequence"""
    from models import Sequence
    
    sequence = db.query(Sequence).filter(
        Sequence.id == sequence_id,
        Sequence.user_id == current_user.id
    ).first()
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    # Update fields
    if request.name is not None:
        sequence.name = request.name
    if request.description is not None:
        sequence.description = request.description
    if request.is_active is not None:
        sequence.is_active = request.is_active
    
    # Update flow data if provided
    if request.flow_data is not None:
        sequence = SequenceService.update_sequence_flow(
            sequence_id, request.flow_data, current_user.id, db
        )
    
    db.commit()
    db.refresh(sequence)
    
    return {
        "id": sequence.id,
        "name": sequence.name,
        "description": sequence.description,
        "is_active": sequence.is_active,
        "flow_data": sequence.flow_data,
        "updated_at": sequence.updated_at.isoformat()
    }


@app.put("/api/sequences/enrollments/{enrollment_id}")
async def update_sequence_enrollment(
    enrollment_id: int,
    request: SequenceEnrollmentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Pause, resume, cancel, or mark a sequence enrollment's outcome."""
    from models import SequenceEnrollment, Sequence

    enrollment = (
        db.query(SequenceEnrollment)
        .join(Sequence, Sequence.id == SequenceEnrollment.sequence_id)
        .filter(
            SequenceEnrollment.id == enrollment_id,
            SequenceEnrollment.user_id == current_user.id,
        )
        .first()
    )

    if not enrollment:
        raise HTTPException(status_code=404, detail="Sequence enrollment not found")

    if not request.action:
        raise HTTPException(status_code=400, detail="Action is required")

    action = request.action.lower()
    allowed = {"pause", "resume", "cancel", "mark_converted", "mark_failed"}
    if action not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported action '{request.action}'")

    now = datetime.utcnow()
    lead = enrollment.lead
    notes = request.notes or ""

    def _serialize() -> dict:
        return {
            "id": enrollment.id,
            "sequence_id": enrollment.sequence_id,
            "lead_id": enrollment.lead_id,
            "status": enrollment.status,
            "current_node_id": enrollment.current_node_id,
            "next_execution_at": enrollment.next_execution_at.isoformat() if enrollment.next_execution_at else None,
            "completed_at": enrollment.completed_at.isoformat() if enrollment.completed_at else None,
            "conversion_outcome": enrollment.conversion_outcome,
            "error_message": enrollment.error_message,
        }

    if action == "pause":
        enrollment.status = "paused"
        enrollment.next_execution_at = None
        db.add(
            LeadActivity(
                lead_id=lead.id,
                user_id=current_user.id,
                activity_type="sequence_paused",
                title="Sequence paused",
                description=notes or "Sequence paused by operator",
                metadata={"sequence_enrollment_id": enrollment.id},
            )
        )

    elif action == "resume":
        enrollment.status = "active"
        enrollment.error_message = None
        if enrollment.next_execution_at is None:
            enrollment.next_execution_at = now
        db.add(
            LeadActivity(
                lead_id=lead.id,
                user_id=current_user.id,
                activity_type="sequence_resumed",
                title="Sequence resumed",
                description=notes or "Sequence resumed by operator",
                metadata={"sequence_enrollment_id": enrollment.id},
            )
        )

    elif action == "cancel":
        enrollment.status = "cancelled"
        enrollment.completed_at = now
        enrollment.conversion_outcome = "cancelled"
        enrollment.next_execution_at = None
        db.add(
            LeadActivity(
                lead_id=lead.id,
                user_id=current_user.id,
                activity_type="sequence_cancelled",
                title="Sequence cancelled",
                description=notes or "Enrollment cancelled by operator",
                metadata={"sequence_enrollment_id": enrollment.id},
            )
        )

    elif action == "mark_converted":
        enrollment.status = "completed"
        enrollment.completed_at = now
        enrollment.conversion_outcome = "converted"
        enrollment.converted = True
        enrollment.conversion_date = now
        enrollment.next_execution_at = None
        lead.status = LeadStatus.CLOSED_WON
        db.add(
            LeadActivity(
                lead_id=lead.id,
                user_id=current_user.id,
                activity_type="sequence_converted",
                title="Lead converted",
                description=notes or "Lead marked as converted",
                metadata={"sequence_enrollment_id": enrollment.id},
            )
        )

    elif action == "mark_failed":
        enrollment.status = "failed"
        enrollment.error_message = notes or "Marked as failed by operator"
        enrollment.completed_at = now
        enrollment.conversion_outcome = "failed"
        enrollment.next_execution_at = None
        db.add(
            LeadActivity(
                lead_id=lead.id,
                user_id=current_user.id,
                activity_type="sequence_failed",
                title="Sequence marked as failed",
                description=enrollment.error_message,
                metadata={"sequence_enrollment_id": enrollment.id},
            )
        )

    record_audit_event(
        db,
        user_id=current_user.id,
        action=f"sequence_enrollment.{action}",
        entity="sequence_enrollment",
        entity_id=enrollment.id,
        metadata={"notes": notes},
    )

    db.commit()
    db.refresh(enrollment)

    if action == "resume" and enrollment.status == "active":
        SequenceService.trigger_processing()

    return _serialize()

@app.delete("/api/sequences/{sequence_id}")
async def delete_sequence(
    sequence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a sequence"""
    from models import Sequence
    
    sequence = db.query(Sequence).filter(
        Sequence.id == sequence_id,
        Sequence.user_id == current_user.id
    ).first()
    
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    
    db.delete(sequence)
    db.commit()
    
    return {"message": "Sequence deleted successfully"}

@app.post("/api/sequences/{sequence_id}/enroll")
async def enroll_leads_in_sequence(
    sequence_id: int,
    request: SequenceEnrollRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enroll leads in a sequence"""
    enrollments = []
    errors = []
    
    for lead_id in request.lead_ids:
        try:
            enrollment = SequenceService.enroll_lead_in_sequence(
                lead_id, sequence_id, current_user.id, db
            )
            enrollments.append({
                "lead_id": lead_id,
                "enrollment_id": enrollment.id,
                "status": "enrolled"
            })
        except Exception as e:
            errors.append({
                "lead_id": lead_id,
                "error": str(e)
            })
    
    return {
        "enrolled_count": len(enrollments),
        "error_count": len(errors),
        "enrollments": enrollments,
        "errors": errors
    }


@app.post("/api/sequences/process")
async def trigger_sequence_processing(current_user: User = Depends(get_current_user)):
    """Manually trigger sequence executor to process pending steps."""
    SequenceService.trigger_processing()
    return {"status": "scheduled"}

@app.get("/api/sequences/{sequence_id}/performance")
async def get_sequence_performance(
    sequence_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get sequence performance metrics"""
    try:
        performance = SequenceService.get_sequence_performance(
            sequence_id, current_user.id, db
        )
        return performance
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/api/sequences/{sequence_id}/analytics")
async def get_sequence_analytics(
    sequence_id: int,
    step: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    channel: Optional[str] = Query(default=None),
    timeframe: Optional[str] = Query(default="30d"),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return detailed analytics for sequence delivery and engagement."""
    filters = {
        "step": step,
        "status": status,
        "channel": channel,
        "timeframe": timeframe,
        "search": search,
    }
    try:
        analytics = SequenceService.get_sequence_analytics(
            sequence_id,
            current_user.id,
            db,
            filters=filters,
            limit=limit,
            offset=offset,
        )
        return analytics
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

@app.get("/api/sequences/templates")
async def get_sequence_templates():
    """Get available sequence templates"""
    return [
        {
            "name": "hot_lead_followup",
            "display_name": "Hot Lead Follow-up",
            "description": "Aggressive 5-day follow-up for leads with 80+ scores",
            "category": "conversion",
            "estimated_duration_days": 5,
            "node_count": 9
        },
        {
            "name": "warm_lead_nurture",
            "display_name": "Warm Lead Nurture",
            "description": "Educational 7-day sequence for warm prospects",
            "category": "nurturing",
            "estimated_duration_days": 7,
            "node_count": 7
        },
        {
            "name": "cold_lead_revival",
            "display_name": "Cold Lead Revival",
            "description": "Re-engagement sequence for cold leads",
            "category": "reactivation",
            "estimated_duration_days": 14,
            "node_count": 5
        }
    ]

# Voice Agent API Endpoints
class VoiceCallStartRequest(BaseModel):
    lead_id: int
    config: Optional[dict] = None

class VoiceCallResponse(BaseModel):
    id: str
    lead_id: int
    status: str
    duration_seconds: Optional[int]
    outcome: Optional[str]
    interest_level: Optional[str]
    appointment_scheduled: bool
    recording_url: Optional[str]
    transcript_json: Optional[dict]
    conversation_state: str
    first_audio_latency_ms: Optional[int]
    ai_summary: Optional[str]
    next_steps: Optional[str]
    total_cost: Optional[float]
    ai_cost: Optional[float]
    carrier: Optional[str]
    call_control_id: Optional[str]
    created_at: str
    ended_at: Optional[str]

class VoiceBookingResponse(BaseModel):
    id: str
    lead_id: int
    call_id: str
    window_start: str
    window_end: str
    status: str
    booking_type: str
    notes: Optional[str]

class VoiceAnalyticsResponse(BaseModel):
    total_calls: int
    total_connects: int
    total_bookings: int
    avg_booking_rate: float
    avg_duration_seconds: int
    avg_latency_ms: int
    total_call_cost_usd: float
    total_ai_cost_usd: float
    daily_breakdown: List[dict]
    outcome_breakdown: List[dict]
    sentiment_trends: List[dict]
    insights: dict


class BillingUsageResponse(BaseModel):
    day: str
    metric: str
    quantity: float
    cost_usd: float
    metadata: Optional[dict]


class StripeProvisionRequest(BaseModel):
    price_id: Optional[str] = None


class StripeSessionRequest(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)
    type: Optional[str] = None
    planId: Optional[str] = Field(default=None, alias="planId")
    promotion_id: Optional[int] = Field(default=None, alias="promotion_id")
    promotion_code: Optional[str] = Field(default=None, alias="promotion_code")

    class Config:
        allow_population_by_field_name = True


def _mock_checkout_url() -> str:
    token = secrets.token_hex(6)
    return f"https://dashboard.stripe.com/test-mode/checkout/mock-{token}"


@app.post("/api/billing/stripe/session")
async def create_billing_stripe_session(
    payload: StripeSessionRequest,
    current_user: User = Depends(get_current_user),
):
    amount = payload.amount or 0.0
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero")

    session = SessionLocal()
    promotion_record: Optional[WalletPromotion] = None
    checkout_session: Optional[Dict[str, Any]] = None
    billing_url = settings.billing_service_url
    try:
        if payload.promotion_id or payload.promotion_code:
            query = session.query(WalletPromotion).filter(WalletPromotion.user_id == current_user.id)
            if payload.promotion_id:
                query = query.filter(WalletPromotion.id == payload.promotion_id)
            if payload.promotion_code:
                query = query.filter(WalletPromotion.code == payload.promotion_code)
            promotion_record = query.first()
            if not promotion_record:
                raise HTTPException(status_code=404, detail="Promotion not found")
            try:
                promotion_lock_promotion(session, promotion_record, amount=amount)
            except ValueError as exc:
                session.rollback()
                raise HTTPException(status_code=409, detail=str(exc)) from exc

        amount_cents = int(round(amount * 100))
        if amount_cents <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than zero")

        base_frontend = str(settings.frontend_url) if settings.frontend_url else "http://localhost:3000"
        success_url = f"{base_frontend.rstrip('/')}/wallet?status=success&session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{base_frontend.rstrip('/')}/wallet?status=cancelled&session_id={{CHECKOUT_SESSION_ID}}"

        metadata: Dict[str, Any] = {}
        if payload.type:
            metadata["intent_type"] = payload.type
        if payload.planId:
            metadata["plan_id"] = payload.planId
        if promotion_record:
            multiplier = promotion_record.multiplier or 2
            metadata.setdefault("promotion_id", promotion_record.id)
            metadata.setdefault("promotion_code", promotion_record.code)
            metadata.setdefault("promotion_multiplier", multiplier)
            metadata.setdefault("promotion_credit_amount", int(amount_cents * multiplier))
        metadata.setdefault(
            "credit_amount",
            int(amount_cents if not promotion_record else amount_cents * (promotion_record.multiplier or 2)),
        )

        if billing_url:
            user_uuid = uuid.uuid5(uuid.NAMESPACE_DNS, f"fishmouth-user-{current_user.id}")
            remote_payload: Dict[str, Any] = {
                "user_id": str(user_uuid),
                "success_url": success_url,
                "cancel_url": cancel_url,
                "customer_email": current_user.email,
                "metadata": metadata,
                "amount_cents": amount_cents,
            }
            if payload.planId:
                remote_payload["plan_code"] = payload.planId
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(f"{billing_url.rstrip('/')}/checkout", json=remote_payload)
                resp.raise_for_status()
                data = resp.json()
                plan_info = data.get("plan") or {}
                checkout_session = {
                    "id": data.get("session_id"),
                    "url": data.get("checkout_url"),
                    "mode": plan_info.get("mode", "payment"),
                }
            except (httpx.HTTPError, ValueError) as exc:
                logger.exception("billing.remote_session_failed", error=str(exc))
                if not settings.providers.stripe_secret_key:
                    session.rollback()
                    raise HTTPException(status_code=502, detail="Failed to create checkout session") from exc
                checkout_session = None  # fall back to local Stripe below

        if checkout_session is None:
            try:
                checkout_session = create_checkout_session(
                    user=current_user,
                    amount_cents=amount_cents,
                    success_url=success_url,
                    cancel_url=cancel_url,
                    promotion=promotion_record,
                    metadata=metadata,
                )
            except ValueError as exc:
                session.rollback()
                raise HTTPException(status_code=400, detail=str(exc))

        if promotion_record:
            session.add(promotion_record)
        session.commit()
    finally:
        session.close()

    if checkout_session:
        response: Dict[str, Any] = {
            "checkoutUrl": checkout_session.get("url"),
            "sessionId": checkout_session.get("id"),
            "mode": checkout_session.get("mode"),
        }
    else:
        response = {"checkoutUrl": _mock_checkout_url(), "sessionId": None, "mock": True}

    if promotion_record:
        response["promotion"] = serialize_wallet_promotion(promotion_record)

    return response


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    entity: str
    entity_id: str
    metadata: Optional[dict]
    created_at: str

@app.post("/api/voice/calls/start")
async def start_voice_call(
    request: VoiceCallStartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new voice call"""
    try:
        # Get lead and verify ownership
        lead = db.query(Lead).filter(
            Lead.id == request.lead_id,
            Lead.user_id == current_user.id
        ).first()

        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")

        if not lead.homeowner_phone:
            raise HTTPException(status_code=400, detail="Lead has no phone number")

        if lead.voice_opt_out:
            raise HTTPException(status_code=400, detail="Lead has opted out of voice outreach")
        
        call_config = build_voice_call_config(db, current_user.id)

        # Start voice agent
        voice_agent = VoiceAgentService(call_config, db)
        call_id = await voice_agent.start_call(request.lead_id, current_user.id)
        record_audit_event(
            db,
            user_id=current_user.id,
            action="voice_call.start",
            entity="voice_call",
            entity_id=call_id,
            metadata={"lead_id": request.lead_id},
        )
        db.commit()

        return {"call_id": call_id, "status": "initiated"}

    except PermissionError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start call: {str(e)}")


@app.post("/api/webhooks/telnyx")
async def telnyx_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    payload = await request.json()
    verify_telnyx_signature(request, payload)

    data = payload.get("data", {})
    event_type = data.get("event_type")
    event_payload = data.get("payload", {})
    call_control_id = event_payload.get("call_control_id")

    if not call_control_id:
        return {"status": "ignored"}

    call = db.query(VoiceCall).filter(VoiceCall.call_control_id == call_control_id).first()
    if not call:
        return {"status": "ignored"}

    db.add(
        VoiceCallEvent(
            call_id=call.id,
            event_type=event_type,
            payload=payload,
        )
    )

    cause = event_payload.get("hangup_cause") or event_payload.get("cause")

    failure_event = event_type in {"call.failed"} or (
        event_type in {"call.disconnected", "call.terminated"}
        and (cause or "").lower() not in {"completed", "normal_clearing", "canceled"}
    )

    if event_type == "call.answered":
        call.status = "in_progress"
        call.started_at = datetime.utcnow()
    elif failure_event:
        voice_agent = VoiceAgentService(build_voice_call_config(db, call.user_id), db)
        voice_agent._handle_pipeline_failure(db, call, cause or "carrier_failure")
        return {"status": call.status}
    elif event_type in {"call.hangup", "call.disconnected"}:
        call.status = "completed"
        call.outcome = call.outcome or "completed"
        call.ended_at = datetime.utcnow()
        if call.started_at and not call.duration_seconds:
            call.duration_seconds = int((call.ended_at - call.started_at).total_seconds())
        if call.lead:
            db.add(
                LeadActivity(
                    lead_id=call.lead_id,
                    user_id=call.user_id,
                    activity_type="voice_call_status",
                    title="Voice call completed",
                    description=f"Call ended ({cause or 'completed'})",
                    metadata={
                        "call_id": call.id,
                        "carrier": call.carrier,
                        "cause": cause,
                    },
                )
            )
        record_audit_event(
            db,
            user_id=call.user_id,
            action="voice_call.end",
            entity="voice_call",
            entity_id=call.id,
            metadata={"event": event_type, "cause": cause},
        )
    elif event_type == "call.bridged":
        call.status = "in_progress"
    elif event_type == "call.terminated" and payload.get("data", {}).get("payload", {}).get("cause") == "canceled":
        call.status = "cancelled"

    db.commit()
    return {"status": "ok"}


@app.websocket("/api/voice/stream/{call_id}")
async def voice_media_stream(call_id: str, websocket: WebSocket):
    await websocket.accept()
    db = SessionLocal()
    try:
        call = db.query(VoiceCall).filter(VoiceCall.id == call_id).first()
        if not call:
            await websocket.close(code=4100)
            return
        stream = WebsocketTelnyxStream(websocket, call.call_control_id or call.id)
        await register_stream(call.call_control_id or call.id, stream)
        await stream.wait_closed()
    except WebSocketDisconnect:
        logger.info("voice.stream.disconnected", call_id=call_id)
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("voice.stream.error", call_id=call_id, exc_info=exc)
        try:
            await websocket.close(code=4101)
        except Exception:
            pass
    finally:
        db.close()

@app.post("/api/voice/calls/{call_id}/end")
async def end_voice_call(
    call_id: str,
    outcome: str = "completed",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End a voice call"""
    
    call = db.query(VoiceCall).filter(
        VoiceCall.id == call_id,
        VoiceCall.user_id == current_user.id
    ).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    voice_agent = VoiceAgentService(VoiceCallConfig(), db)
    await voice_agent.end_call(call_id, outcome=outcome)
    return {"status": "call_ended", "outcome": outcome}

@app.get("/api/voice/calls/{call_id}", response_model=VoiceCallResponse)
async def get_voice_call(
    call_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get voice call details"""
    
    call = db.query(VoiceCall).filter(
        VoiceCall.id == call_id,
        VoiceCall.user_id == current_user.id
    ).first()
    
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    return VoiceCallResponse(
        id=call.id,
        lead_id=call.lead_id,
        status=call.status,
        duration_seconds=call.duration_seconds,
        outcome=call.outcome,
        interest_level=call.interest_level,
        appointment_scheduled=call.appointment_scheduled,
        recording_url=call.recording_url,
        transcript_json=call.transcript_json,
        conversation_state=call.conversation_state,
        first_audio_latency_ms=call.first_audio_latency_ms,
        ai_summary=(call.ai_summary or {}).get("summary") if isinstance(call.ai_summary, dict) else call.ai_summary,
        next_steps=call.next_steps,
        total_cost=call.total_cost,
        ai_cost=call.ai_cost,
        carrier=call.carrier,
        call_control_id=call.call_control_id,
        created_at=call.initiated_at.isoformat(),
        ended_at=call.ended_at.isoformat() if call.ended_at else None
    )

@app.get("/api/voice/calls")
async def get_voice_calls(
    lead_id: Optional[int] = None,
    status: Optional[str] = None,
    outcome: Optional[str] = None,
    interest_level: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get voice calls list"""

    query = (
        db.query(VoiceCall)
        .filter(VoiceCall.user_id == current_user.id)
        .join(Lead, VoiceCall.lead_id == Lead.id, isouter=True)
    )

    if lead_id:
        query = query.filter(VoiceCall.lead_id == lead_id)
    if status:
        query = query.filter(VoiceCall.status == status)
    if outcome:
        query = query.filter(VoiceCall.outcome == outcome)
    if interest_level:
        query = query.filter(VoiceCall.interest_level == interest_level)
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            func.lower(func.coalesce(VoiceCall.to_number, "")).like(like)
            | func.lower(func.coalesce(VoiceCall.id, "")).like(like)
            | func.lower(func.coalesce(Lead.homeowner_name, "")).like(like)
        )

    calls = query.order_by(VoiceCall.initiated_at.desc()).limit(limit).all()

    return [
        {
            "id": call.id,
            "lead_id": call.lead_id,
             "lead_name": call.lead.homeowner_name if call.lead else None,
            "status": call.status,
            "duration_seconds": call.duration_seconds,
            "outcome": call.outcome,
            "interest_level": call.interest_level,
            "appointment_scheduled": call.appointment_scheduled,
            "conversation_state": call.conversation_state,
            "to_number": call.to_number,
            "ai_summary": (call.ai_summary or {}).get("summary") if isinstance(call.ai_summary, dict) else call.ai_summary,
            "next_steps": call.next_steps,
            "total_cost": call.total_cost,
            "ai_cost": call.ai_cost,
            "carrier": call.carrier,
            "call_control_id": call.call_control_id,
            "retry_attempts": call.retry_attempts,
            "created_at": call.initiated_at.isoformat(),
            "ended_at": call.ended_at.isoformat() if call.ended_at else None
        }
        for call in calls
    ]

@app.post("/api/voice/bookings")
async def create_voice_booking(
    booking_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a booking from voice call"""
    
    # Verify lead ownership
    lead = db.query(Lead).filter(
        Lead.id == booking_data["lead_id"],
        Lead.user_id == current_user.id
    ).first()
    
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    booking = VoiceBooking(
        lead_id=booking_data["lead_id"],
        call_id=booking_data.get("call_id"),
        window_start=datetime.fromisoformat(booking_data["window_start"]),
        window_end=datetime.fromisoformat(booking_data["window_end"]),
        notes=booking_data.get("notes", ""),
        booking_type=booking_data.get("booking_type", "inspection")
    )
    
    db.add(booking)
    db.commit()
    db.refresh(booking)
    
    return {
        "id": booking.id,
        "status": "confirmed",
        "message": "Booking created successfully"
    }

@app.get("/api/voice/bookings")
async def get_voice_bookings(
    lead_id: Optional[int] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get voice bookings list"""
    
    # Get bookings for user's leads
    query = db.query(VoiceBooking).join(Lead).filter(Lead.user_id == current_user.id)
    
    if lead_id:
        query = query.filter(VoiceBooking.lead_id == lead_id)
    if status:
        query = query.filter(VoiceBooking.status == status)
    
    bookings = query.order_by(VoiceBooking.created_at.desc()).all()
    
    return [
        {
            "id": booking.id,
            "lead_id": booking.lead_id,
            "call_id": booking.call_id,
            "window_start": booking.window_start.isoformat(),
            "window_end": booking.window_end.isoformat(),
            "status": booking.status,
            "booking_type": booking.booking_type,
            "notes": booking.notes,
            "created_at": booking.created_at.isoformat()
        }
        for booking in bookings
    ]

@app.get("/api/voice/analytics/daily", response_model=VoiceAnalyticsResponse)
async def get_voice_analytics(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get voice analytics for the last N days"""
    service = VoiceAnalyticsService(db)
    analytics = service.get_daily_metrics(current_user.id, days=days)
    return VoiceAnalyticsResponse(**analytics)

@app.get("/api/voice/config")
async def get_voice_config(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get voice configuration"""
    
    config = db.query(VoiceConfiguration).filter(
        VoiceConfiguration.user_id == current_user.id
    ).first()
    
    if not config:
        # Create default config
        config = VoiceConfiguration(user_id=current_user.id)
        db.add(config)
        db.commit()
        db.refresh(config)
    
    return {
        "id": config.id,
        "default_voice_id": config.default_voice_id,
        "tts_vendor": config.tts_vendor,
        "voice_style": config.voice_style,
        "asr_vendor": config.asr_vendor,
        "asr_language": config.asr_language,
        "llm_vendor": config.llm_vendor,
        "llm_model": config.llm_model,
        "max_call_duration_minutes": config.max_call_duration_minutes,
        "enable_barge_in": config.enable_barge_in,
        "require_consent": config.require_consent,
        "enable_recording": config.enable_recording
    }


@app.post("/api/admin/billing/users/{user_id}/provision")
async def admin_provision_stripe_customer(
    user_id: int,
    payload: StripeProvisionRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    price_id = payload.price_id or settings.providers.stripe_price_id
    if not price_id:
        raise HTTPException(status_code=400, detail="Stripe price ID is not configured")

    try:
        customer_id = ensure_customer(user)
        subscription_id, item_id = create_subscription(customer_id, price_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    user.stripe_customer_id = customer_id
    user.stripe_subscription_id = subscription_id
    user.stripe_subscription_item_id = item_id
    db.commit()

    record_audit_event(
        db,
        user_id=current_admin.id,
        action="billing.provision",
        entity="user",
        entity_id=str(user_id),
        metadata={
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
            "price_id": price_id,
        },
    )

    return {
        "stripe_customer_id": customer_id,
        "stripe_subscription_id": subscription_id,
        "stripe_subscription_item_id": item_id,
    }


@app.get("/api/admin/billing/summary")
async def admin_billing_summary(
    days: int = 30,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    return get_billing_summary(db, days=days)


@app.get("/api/admin/billing/usage", response_model=List[BillingUsageResponse])
async def admin_billing_usage(
    limit: int = 200,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(BillingUsage)
        .order_by(BillingUsage.day.desc(), BillingUsage.metric)
        .limit(min(limit, 500))
        .all()
    )
    return [
        BillingUsageResponse(
            day=row.day.isoformat(),
            metric=row.metric,
            quantity=row.quantity,
            cost_usd=row.cost_usd,
            metadata=row.details,
        )
        for row in rows
    ]


@app.get("/api/admin/billing/users/{user_id}", response_model=List[BillingUsageResponse])
async def admin_billing_usage_for_user(
    user_id: int,
    limit: int = 200,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(BillingUsage)
        .filter(BillingUsage.user_id == user_id)
        .order_by(BillingUsage.day.desc())
        .limit(min(limit, 500))
        .all()
    )
    return [
        BillingUsageResponse(
            day=row.day.isoformat(),
            metric=row.metric,
            quantity=row.quantity,
            cost_usd=row.cost_usd,
            metadata=row.details,
        )
        for row in rows
    ]


@app.get("/api/admin/billing/export")
async def admin_billing_export(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(BillingUsage)
        .order_by(BillingUsage.day.desc(), BillingUsage.metric)
        .all()
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["day", "user_id", "metric", "quantity", "cost_usd"])
    for row in rows:
        writer.writerow([row.day.isoformat(), row.user_id, row.metric, row.quantity, f"{row.cost_usd:.4f}"])
    output.seek(0)
    record_audit_event(
        db,
        user_id=current_admin.id,
        action="billing.export",
        entity="billing_usage",
        entity_id="*",
    )
    db.commit()
    headers = {"Content-Disposition": "attachment; filename=billing_usage.csv"}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)


@app.get("/api/admin/billing/export/period")
async def admin_billing_export_period(
    start: Optional[str] = None,
    end: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    try:
        start_date = date.fromisoformat(start) if start else date.today() - timedelta(days=29)
        end_date = date.fromisoformat(end) if end else date.today()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use ISO YYYY-MM-DD.")

    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start date must be before end date")

    aggregates = aggregate_usage_for_period(db, start=start_date, end=end_date)
    user_ids = list(aggregates.keys())
    users = db.query(User).filter(User.id.in_(user_ids)).all() if user_ids else []
    user_map = {user.id: user for user in users}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "user_id",
        "email",
        "total_cost_usd",
        "platform_margin_usd",
        "provider_cost_usd",
        "voice_minutes",
        "sms_sent",
        "emails_sent",
    ])

    for user_id, data in aggregates.items():
        user = user_map.get(user_id)
        cost = round(data["cost_usd"], 2)
        margin = round(calculate_platform_margin(cost), 2)
        provider_cost = round(cost - margin, 2)
        voice_minutes = round((data.get("voice_seconds", 0.0) or 0.0) / 60.0, 2)
        sms_sent = int(data.get("sms_sent", 0.0) or 0.0)
        emails_sent = int(data.get("emails_sent", 0.0) or 0.0)

        writer.writerow([
            user_id,
            user.email if user else None,
            f"{cost:.2f}",
            f"{margin:.2f}",
            f"{provider_cost:.2f}",
            voice_minutes,
            sms_sent,
            emails_sent,
        ])

    output.seek(0)
    filename = f"billing_period_{start_date.isoformat()}_{end_date.isoformat()}.csv"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}

    record_audit_event(
        db,
        user_id=current_admin.id,
        action="billing.export_period",
        entity="billing_usage",
        entity_id=f"{start_date.isoformat()}_{end_date.isoformat()}",
    )
    db.commit()

    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)


@app.delete("/api/admin/leads/{lead_id}/anonymize")
async def admin_anonymize_lead(
    lead_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.homeowner_name = None
    lead.homeowner_email = None
    lead.homeowner_phone = None
    lead.homeowner_email_encrypted = None
    lead.homeowner_phone_encrypted = None
    lead.homeowner_email_hash = None
    lead.homeowner_phone_hash = None
    db.add(
        LeadActivity(
            lead_id=lead.id,
            user_id=current_admin.id,
            activity_type="lead_anonymized",
            title="Lead anonymized",
            description="Administrator removed sensitive contact information.",
            activity_metadata={"admin_id": current_admin.id},
        )
    )
    record_audit_event(
        db,
        user_id=current_admin.id,
        action="lead.anonymize",
        entity="lead",
        entity_id=lead_id,
    )
    db.commit()
    return {"status": "anonymized"}


@app.delete("/api/admin/users/{user_id}/forget")
async def admin_forget_user(
    user_id: int,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    leads = db.query(Lead).filter(Lead.user_id == user_id).all()
    lead_ids = [lead.id for lead in leads]
    for lead in leads:
        lead.homeowner_name = None
        lead.homeowner_email = None
        lead.homeowner_phone = None
        lead.homeowner_email_encrypted = None
        lead.homeowner_phone_encrypted = None
        lead.homeowner_email_hash = None
        lead.homeowner_phone_hash = None

    calls = db.query(VoiceCall).filter(VoiceCall.user_id == user_id).all()
    for call in calls:
        db.query(VoiceCallTurn).filter(VoiceCallTurn.call_id == call.id).delete(synchronize_session=False)
        db.query(VoiceCallEvent).filter(VoiceCallEvent.call_id == call.id).delete(synchronize_session=False)
    if calls:
        db.query(VoiceCall).filter(VoiceCall.user_id == user_id).delete(synchronize_session=False)

    if lead_ids:
        db.query(LeadActivity).filter(LeadActivity.lead_id.in_(lead_ids)).delete(synchronize_session=False)
        db.query(VoiceBooking).filter(VoiceBooking.lead_id.in_(lead_ids)).delete(synchronize_session=False)

    db.query(VoiceMetricsDaily).filter(VoiceMetricsDaily.user_id == user_id).delete(synchronize_session=False)
    db.query(BillingUsage).filter(BillingUsage.user_id == user_id).delete(synchronize_session=False)
    db.query(AuditLog).filter(AuditLog.user_id == user_id).delete(synchronize_session=False)

    anonymized_email = f"deleted-user-{user.id}@example.com"
    user.email = anonymized_email
    user.phone = None
    user.full_name = None
    user.business_address = None
    user.website = None
    user.stripe_customer_id = None
    user.stripe_subscription_id = None
    user.stripe_subscription_item_id = None
    user.is_active = False

    db.commit()

    record_audit_event(
        db,
        user_id=current_admin.id,
        action="user.forget",
        entity="user",
        entity_id=str(user_id),
        metadata={"anonymized_email": anonymized_email},
    )
    db.commit()

    return {"status": "forgotten"}


@app.get("/api/admin/audit-logs", response_model=List[AuditLogResponse])
async def admin_audit_logs(
    limit: int = 200,
    action: Optional[str] = None,
    entity: Optional[str] = None,
    user_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(AuditLog).order_by(AuditLog.created_at.desc())
    if action:
        query = query.filter(AuditLog.action == action)
    if entity:
        query = query.filter(AuditLog.entity == entity)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if date_from:
        try:
            start_dt = datetime.fromisoformat(date_from)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_from format. Use ISO YYYY-MM-DD")
        query = query.filter(AuditLog.created_at >= start_dt)
    if date_to:
        try:
            end_dt = datetime.fromisoformat(date_to)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date_to format. Use ISO YYYY-MM-DD")
        query = query.filter(AuditLog.created_at <= end_dt)
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            func.lower(func.coalesce(AuditLog.entity_id, "")).like(like)
            | func.lower(func.coalesce(AuditLog.entity, "")).like(like)
            | func.lower(func.coalesce(AuditLog.action, "")).like(like)
        )
    logs = query.limit(min(limit, 500)).all()
    return [
        AuditLogResponse(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            entity=log.entity,
            entity_id=log.entity_id,
            metadata=log.details,
            created_at=log.created_at.isoformat(),
        )
        for log in logs
    ]

@app.put("/api/voice/config")
async def update_voice_config(
    config_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update voice configuration"""
    
    config = db.query(VoiceConfiguration).filter(
        VoiceConfiguration.user_id == current_user.id
    ).first()
    
    if not config:
        config = VoiceConfiguration(user_id=current_user.id)
        db.add(config)
    
    # Update fields
    for field, value in config_data.items():
        if hasattr(config, field):
            setattr(config, field, value)
    
    config.updated_at = datetime.utcnow()
    db.commit()
    
    return {"status": "updated", "message": "Voice configuration updated successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
