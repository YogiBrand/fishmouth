from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Dict, List, Optional
from uuid import UUID

import asyncpg
import httpx
import stripe
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, Field, root_validator

from services.shared.telemetry_middleware import TelemetryMW

logger = logging.getLogger("billing-gw-8032")

app = FastAPI(title="Billing Gateway (8032)")
app.add_middleware(TelemetryMW)

STRIPE_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
TELEMETRY_URL = os.getenv("TELEMETRY_URL", "http://telemetry_gw_8030:8030")
SERVICE_ID = "8032"
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@postgres:5432/app")
PLAN_CONFIG_ENV = os.getenv("BILLING_PRICE_CONFIG", "")
PLAN_CONFIG_PATH = os.getenv("BILLING_PRICE_CONFIG_FILE")

stripe.api_key = STRIPE_KEY or None

db_pool: Optional[asyncpg.pool.Pool] = None


def _stringify_metadata(data: Dict[str, Any]) -> Dict[str, str]:
    result: Dict[str, str] = {}
    for key, value in data.items():
        if value is None:
            continue
        if isinstance(value, (dict, list)):
            result[key] = json.dumps(value)
        else:
            result[key] = str(value)
    return result

class PlanDefinition(BaseModel):
    code: str = Field(..., description="Internal plan code")
    price_id: Optional[str] = Field(None, description="Stripe Price ID")
    name: str
    kind: str = Field(..., regex="^(wallet|plan)$")
    mode: str = Field(..., regex="^(payment|subscription)$")
    amount_cents: Optional[int] = Field(default=None, description="Expected amount in cents")
    currency: str = Field(default="usd")
    credits: Optional[int] = Field(default=None, description="Wallet credits to add for wallet plans")
    plan_name: Optional[str] = Field(default=None, description="Analytics plan label for subscriptions")
    interval: Optional[str] = Field(default=None, description="Stripe billing interval for display")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata to attach to sessions")


class CheckoutRequest(BaseModel):
    user_id: UUID
    success_url: str
    cancel_url: str
    customer_email: Optional[str] = None
    price_id: Optional[str] = None
    plan_code: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    amount_cents: Optional[int] = Field(default=None, gt=0)

    @root_validator
    def ensure_identifier(cls, values: Dict[str, Any]) -> Dict[str, Any]:
        if not values.get("price_id") and not values.get("plan_code") and not values.get("amount_cents"):
            raise ValueError("Either price_id, plan_code, or amount_cents must be provided")
        return values


class CheckoutResponse(BaseModel):
    session_id: str
    checkout_url: str
    expires_at: Optional[int] = None
    plan: PlanDefinition


class PlanListResponse(BaseModel):
    plans: List[PlanDefinition]


class WebhookAck(BaseModel):
    received: bool = True


def _load_plan_config() -> Dict[str, PlanDefinition]:
    payload: List[Dict[str, Any]] = []
    if PLAN_CONFIG_PATH and os.path.exists(PLAN_CONFIG_PATH):
        try:
            with open(PLAN_CONFIG_PATH, "r", encoding="utf-8") as handle:
                payload.extend(json.load(handle))
        except Exception as exc:
            logger.warning("failed_loading_plan_config_file", extra={"error": str(exc), "path": PLAN_CONFIG_PATH})
    if PLAN_CONFIG_ENV:
        try:
            env_payload = json.loads(PLAN_CONFIG_ENV)
            if isinstance(env_payload, dict):
                payload.append(env_payload)
            elif isinstance(env_payload, list):
                payload.extend(env_payload)
        except json.JSONDecodeError as exc:
            logger.warning("invalid_plan_config_env", extra={"error": str(exc)})
    plans: Dict[str, PlanDefinition] = {}
    for item in payload:
        try:
            plan = PlanDefinition(**item)
            plans[plan.price_id] = plan
        except Exception as exc:
            logger.warning("invalid_plan_entry", extra={"error": str(exc), "entry": item})
    if not plans:
        logger.info("billing.plan_config_missing")
    return plans


PLANS_BY_PRICE_ID: Dict[str, PlanDefinition] = _load_plan_config()
PLANS_BY_CODE: Dict[str, PlanDefinition] = {plan.code: plan for plan in PLANS_BY_PRICE_ID.values()}


async def _emit_cost(item: str, quantity: float, unit: str, unit_cost: float, meta: Dict[str, Any] | None = None) -> None:
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
        logger.debug("telemetry_cost_emit_failed")


async def _create_checkout_session(plan: PlanDefinition, payload: CheckoutRequest) -> stripe.checkout.Session:
    if not STRIPE_KEY:
        raise HTTPException(status_code=400, detail="STRIPE_SECRET_KEY not configured")

    base_metadata = {
        "user_id": str(payload.user_id),
        "plan_code": plan.code,
        "plan_kind": plan.kind,
        "price_id": plan.price_id,
    }
    base_metadata.update(_stringify_metadata(plan.metadata))
    base_metadata.update(_stringify_metadata(payload.metadata))

    line_item: Dict[str, Any]
    if plan.price_id:
        line_item = {"price": plan.price_id, "quantity": 1}
    else:
        amount_cents = payload.amount_cents or plan.amount_cents
        if amount_cents is None:
            raise HTTPException(status_code=400, detail="amount_cents required for checkout")
        line_item = {
            "price_data": {
                "currency": plan.currency,
                "product_data": {"name": plan.name},
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }

    params: Dict[str, Any] = {
        "mode": plan.mode,
        "line_items": [line_item],
        "success_url": payload.success_url,
        "cancel_url": payload.cancel_url,
        "client_reference_id": str(payload.user_id),
        "metadata": base_metadata,
    }
    if payload.customer_email:
        params["customer_email"] = payload.customer_email
    if plan.kind == "wallet":
        params["payment_intent_data"] = {"metadata": base_metadata}
    if plan.mode == "subscription":
        params["subscription_data"] = {"metadata": base_metadata}

    loop = asyncio.get_running_loop()
    try:
        session: stripe.checkout.Session = await loop.run_in_executor(
            None, lambda: stripe.checkout.Session.create(**params)
        )
    except stripe.error.StripeError as exc:
        logger.exception("stripe_checkout_create_failed", extra={"plan": plan.code})
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return session


async def _ensure_user(conn: asyncpg.Connection, user_id: UUID, email: Optional[str]) -> None:
    existing = await conn.fetchval("SELECT 1 FROM analytics.users WHERE user_id=$1", user_id)
    if existing:
        if email:
            await conn.execute(
                "UPDATE analytics.users SET email=$2 WHERE user_id=$1 AND email IS DISTINCT FROM $2",
                user_id,
                email,
            )
        return
    fallback_email = email or f"user+{user_id.hex}@example.local"
    await conn.execute(
        "INSERT INTO analytics.users(user_id, email, plan) VALUES($1, $2, 'free')",
        user_id,
        fallback_email,
    )


async def _record_transaction(
    conn: asyncpg.Connection,
    user_id: UUID,
    amount_cents: int,
    kind: str,
    plan: PlanDefinition,
    currency: str,
    session_id: str,
) -> None:
    await conn.execute(
        """
        INSERT INTO analytics.transactions(user_id, amount_cents, kind)
        VALUES ($1, $2, $3)
        """,
        user_id,
        amount_cents,
        "charge" if kind == "wallet" else kind,
    )
    await conn.execute(
        """
        INSERT INTO analytics.usage_events(service, route, action, user_id, entity, quantity, unit, meta)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        """,
        SERVICE_ID,
        "/stripe/webhook",
        "stripe_checkout_completed",
        user_id,
        plan.code,
        amount_cents / 100.0,
        currency,
        json.dumps({"session_id": session_id, "plan_kind": plan.kind}),
    )


async def _apply_wallet_credit(conn: asyncpg.Connection, user_id: UUID, plan: PlanDefinition, amount_cents: int) -> None:
    credits_to_add = plan.credits
    if credits_to_add is None:
        credits_to_add = amount_cents
    await conn.execute(
        "UPDATE analytics.users SET credits = credits + $2 WHERE user_id = $1",
        user_id,
        credits_to_add,
    )


async def _apply_subscription(conn: asyncpg.Connection, user_id: UUID, plan: PlanDefinition) -> None:
    if plan.plan_name:
        await conn.execute(
            "UPDATE analytics.users SET plan = $2 WHERE user_id = $1",
            user_id,
            plan.plan_name,
        )


async def _handle_checkout_completed(session: Dict[str, Any]) -> None:
    metadata = session.get("metadata") or {}
    user_id_raw = metadata.get("user_id")
    plan_code = metadata.get("plan_code")
    if not user_id_raw or not plan_code:
        logger.warning("checkout_completed_missing_metadata", extra={"metadata": metadata})
        return
    try:
        user_id = UUID(str(user_id_raw))
    except ValueError:
        logger.warning("checkout_completed_invalid_user_id", extra={"user_id": user_id_raw})
        return

    plan = PLANS_BY_CODE.get(plan_code)
    if plan is None:
        logger.warning("checkout_completed_unknown_plan", extra={"plan_code": plan_code})
        return

    amount_cents = session.get("amount_total")
    currency = session.get("currency") or plan.currency
    session_id = session.get("id", "")
    customer_details = session.get("customer_details") or {}
    email = customer_details.get("email") or metadata.get("customer_email")

    if amount_cents is None:
        logger.warning("checkout_completed_missing_amount", extra={"session_id": session_id})
        return

    if db_pool is None:
        logger.warning("checkout_completed_no_db_pool")
        return

    async with db_pool.acquire() as conn:
        async with conn.transaction():
            await _ensure_user(conn, user_id, email)
            await _record_transaction(conn, user_id, amount_cents, plan.kind, plan, currency, session_id)
            if plan.kind == "wallet":
                await _apply_wallet_credit(conn, user_id, plan, amount_cents)
            else:
                await _apply_subscription(conn, user_id, plan)

    await _emit_cost(
        "stripe_revenue",
        1,
        "session",
        (amount_cents or 0) / 100.0,
        {"plan_code": plan.code, "currency": currency},
    )


def _resolve_plan(payload: CheckoutRequest) -> PlanDefinition:
    if payload.plan_code:
        plan = PLANS_BY_CODE.get(payload.plan_code)
        if plan:
            return plan
    if payload.price_id:
        plan = PLANS_BY_PRICE_ID.get(payload.price_id)
        if plan:
            return plan
    if payload.amount_cents:
        return PlanDefinition(
            code=f"wallet_dynamic_{payload.amount_cents}",
            price_id=None,
            name="Wallet Reload",
            kind="wallet",
            mode="payment",
            amount_cents=payload.amount_cents,
            currency="usd",
            credits=payload.metadata.get("credit_amount") if payload.metadata else None,
        )
    raise HTTPException(status_code=404, detail="Unknown pricing option")


@app.on_event("startup")
async def startup() -> None:
    global db_pool, PLANS_BY_PRICE_ID, PLANS_BY_CODE
    try:
        db_pool = await asyncpg.create_pool(dsn=DATABASE_URL, min_size=1, max_size=5)
        logger.info("billing.db_pool_ready")
    except Exception as exc:
        db_pool = None
        logger.exception("billing.db_pool_failed", extra={"error": str(exc)})
    PLANS_BY_PRICE_ID = _load_plan_config()
    PLANS_BY_CODE = {plan.code: plan for plan in PLANS_BY_PRICE_ID.values()}
    if not PLANS_BY_PRICE_ID:
        logger.warning("billing.plan_config_empty")


@app.on_event("shutdown")
async def shutdown() -> None:
    global db_pool
    pool = db_pool
    db_pool = None
    if pool is not None:
        await pool.close()


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/plans", response_model=PlanListResponse)
async def list_plans() -> PlanListResponse:
    return PlanListResponse(plans=list(PLANS_BY_PRICE_ID.values()))


@app.post("/checkout", response_model=CheckoutResponse)
async def checkout(payload: CheckoutRequest) -> CheckoutResponse:
    plan = _resolve_plan(payload)
    session = await _create_checkout_session(plan, payload)
    await _emit_cost(
        "stripe_checkout_session",
        1,
        "call",
        0.03,
        {"plan_code": plan.code, "mode": plan.mode},
    )
    response = CheckoutResponse(
        session_id=session.id,
        checkout_url=session.url,
        expires_at=getattr(session, "expires_at", None),
        plan=plan,
    )
    return response


@app.post("/stripe/webhook", response_model=WebhookAck)
async def stripe_webhook(request: Request) -> WebhookAck:
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="STRIPE_WEBHOOK_SECRET not configured")
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if sig_header is None:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid payload") from exc
    except stripe.error.SignatureVerificationError as exc:
        raise HTTPException(status_code=400, detail="Signature verification failed") from exc

    event_type = event.get("type")
    data_object = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(data_object)
    else:
        logger.debug("stripe_event_ignored", extra={"event_type": event_type})

    return WebhookAck()


class CheckoutStatusResponse(BaseModel):
    session_id: str
    payment_status: str
    amount_total: Optional[int] = None
    currency: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    customer_email: Optional[str] = None


@app.get("/checkout/{session_id}", response_model=CheckoutStatusResponse)
async def get_checkout_session(session_id: str) -> CheckoutStatusResponse:
    if not STRIPE_KEY:
        raise HTTPException(status_code=500, detail="STRIPE_SECRET_KEY not configured")
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.InvalidRequestError:
        raise HTTPException(status_code=404, detail="checkout_session_not_found")
    except stripe.error.StripeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    metadata = session.get("metadata") or {}
    customer_details = session.get("customer_details") or {}
    return CheckoutStatusResponse(
        session_id=session.get("id"),
        payment_status=session.get("payment_status", "unknown"),
        amount_total=session.get("amount_total"),
        currency=session.get("currency"),
        metadata=metadata,
        customer_email=customer_details.get("email"),
    )
