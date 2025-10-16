"""Wallet management endpoints (promotions, incentives)."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field

from auth import get_current_user
from database import SessionLocal
from models import User, WalletPromotion
from services.billing_stripe import retrieve_checkout_session
from services.promotion_service import (
    create_double_credit_promotion,
    list_promotions,
    lock_promotion,
    mark_viewed,
    redeem_promotion,
    serialize_promotion,
)
from config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/wallet", tags=["wallet"])


class PromotionContext(BaseModel):
    wallet_reload_total: Optional[float] = Field(default=0.0, ge=0)
    force: Optional[bool] = False


class PromotionIssueRequest(BaseModel):
    trigger: str = Field(default="level_up", pattern=r"^[a-zA-Z0-9_\-]+$")
    level: int = Field(default=1, ge=1)
    context: Optional[PromotionContext] = None


class PromotionResponse(BaseModel):
    id: int
    code: str
    multiplier: float
    reward_type: str
    trigger_source: str
    status: str
    metadata: Dict[str, Any]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    expires_at: Optional[str] = None
    redeemed_at: Optional[str] = None
    locked_at: Optional[str] = None
    viewed_at: Optional[str] = None
    extension_count: int = 0
    triggered_level: Optional[int] = None
    lock_amount: Optional[float] = None
    status_reason: Optional[str] = None


class PromotionLockRequest(BaseModel):
    amount: Optional[float] = Field(default=None, gt=0)


class PromotionRedeemRequest(BaseModel):
    amount: float = Field(gt=0)
    credit_amount: float = Field(gt=0)
    metadata: Optional[Dict[str, Any]] = None


class WalletSummaryResponse(BaseModel):
    balance: float
    balance_cents: int
    promotions: List[PromotionResponse]


class CheckoutConfirmRequest(BaseModel):
    session_id: Optional[str] = None
    amount_cents: Optional[int] = Field(default=None, gt=0)
    credit_cents: Optional[int] = Field(default=None, gt=0)
    promotion_id: Optional[int] = None


def _get_promotion(session, user_id: int, promotion_id: int) -> WalletPromotion:
    promotion = (
        session.query(WalletPromotion)
        .filter(WalletPromotion.id == promotion_id, WalletPromotion.user_id == user_id)
        .first()
    )
    if not promotion:
        raise HTTPException(status_code=404, detail="Promotion not found")
    return promotion


def _serialize_wallet_summary(session, user: User) -> WalletSummaryResponse:
    promotions = list_promotions(session, user)
    balance_cents = int(user.wallet_balance_cents or 0)
    balance = round(balance_cents / 100, 2)
    return WalletSummaryResponse(
        balance=balance,
        balance_cents=balance_cents,
        promotions=[PromotionResponse(**serialize_promotion(promotion)) for promotion in promotions],
    )


@router.get("/summary", response_model=WalletSummaryResponse)
def get_wallet_summary(current_user: User = Depends(get_current_user)) -> WalletSummaryResponse:
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        summary = _serialize_wallet_summary(session, user)
        session.commit()
        return summary
    finally:
        session.close()


@router.get("/promotions", response_model=List[PromotionResponse])
def get_wallet_promotions(current_user: User = Depends(get_current_user)) -> List[PromotionResponse]:
    session = SessionLocal()
    try:
        promotions = list_promotions(session, current_user)
        session.commit()
        return [PromotionResponse(**serialize_promotion(promotion)) for promotion in promotions]
    finally:
        session.close()


@router.post("/promotions/issue", response_model=PromotionResponse)
def issue_double_credit_promotion(
    payload: PromotionIssueRequest,
    current_user: User = Depends(get_current_user),
) -> PromotionResponse:
    session = SessionLocal()
    try:
        context_dict = payload.context.model_dump() if payload.context else {}
        try:
            promotion = create_double_credit_promotion(
                session,
                user=current_user,
                level=payload.level,
                trigger_source=payload.trigger,
                context=context_dict,
            )
            session.commit()
        except ValueError as exc:
            session.rollback()
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        return PromotionResponse(**serialize_promotion(promotion))
    finally:
        session.close()


@router.post("/promotions/{promotion_id}/redeem", response_model=PromotionResponse)
def redeem_wallet_promotion(
    payload: PromotionRedeemRequest,
    promotion_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
) -> PromotionResponse:
    session = SessionLocal()
    try:
        promotion = _get_promotion(session, current_user.id, promotion_id)
        try:
            redeem_promotion(
                session,
                promotion,
                amount=payload.amount,
                credit_amount=payload.credit_amount,
                metadata=payload.metadata,
            )
        except ValueError as exc:
            session.rollback()
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        session.commit()
        return PromotionResponse(**serialize_promotion(promotion))
    finally:
        session.close()


@router.post("/promotions/{promotion_id}/acknowledge", response_model=PromotionResponse)
def acknowledge_promotion(
    promotion_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
) -> PromotionResponse:
    session = SessionLocal()
    try:
        promotion = _get_promotion(session, current_user.id, promotion_id)
        mark_viewed(session, promotion)
        session.commit()
        return PromotionResponse(**serialize_promotion(promotion))
    finally:
        session.close()


@router.post("/promotions/{promotion_id}/lock", response_model=PromotionResponse)
def lock_wallet_promotion(
    payload: PromotionLockRequest,
    promotion_id: int = Path(..., ge=1),
    current_user: User = Depends(get_current_user),
) -> PromotionResponse:
    session = SessionLocal()
    try:
        promotion = _get_promotion(session, current_user.id, promotion_id)
        try:
            lock_promotion(session, promotion, amount=payload.amount)
        except ValueError as exc:
            session.rollback()
            raise HTTPException(status_code=409, detail=str(exc)) from exc
        session.commit()
        return PromotionResponse(**serialize_promotion(promotion))
    finally:
        session.close()


@router.post("/checkout/confirm", response_model=WalletSummaryResponse)
async def confirm_wallet_checkout(
    payload: CheckoutConfirmRequest,
    current_user: User = Depends(get_current_user),
) -> WalletSummaryResponse:
    session = SessionLocal()
    try:
        user = session.query(User).filter(User.id == current_user.id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        amount_cents = payload.amount_cents
        credit_cents = payload.credit_cents
        promotion_id = payload.promotion_id
        promotion_record: Optional[WalletPromotion] = None
        metadata: Dict[str, Any] = {}
        billing_url = get_settings().billing_service_url

        if payload.session_id:
            session_validated = False
            if billing_url:
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        resp = await client.get(f"{billing_url.rstrip('/')}/checkout/{payload.session_id}")
                    resp.raise_for_status()
                    remote = resp.json()
                    if remote.get("payment_status") != "paid":
                        raise HTTPException(status_code=409, detail="Checkout session not completed")
                    amount_total = remote.get("amount_total")
                    if amount_total:
                        amount_cents = int(amount_total)
                    metadata = remote.get("metadata") or {}
                    credit_meta = metadata.get("promotion_credit_amount") or metadata.get("credit_amount")
                    if credit_meta:
                        credit_cents = int(credit_meta)
                    if not promotion_id and metadata.get("promotion_id"):
                        promotion_id = int(metadata["promotion_id"])
                    session_validated = True
                except httpx.HTTPStatusError as exc:
                    if exc.response.status_code != 404:
                        logger.exception("wallet.remote_checkout_lookup_failed", error=str(exc))
                except httpx.HTTPError as exc:
                    logger.exception("wallet.remote_checkout_lookup_failed", error=str(exc))
            if not session_validated:
                checkout_session = retrieve_checkout_session(payload.session_id)
                if checkout_session:
                    if checkout_session.get("payment_status") != "paid":
                        raise HTTPException(status_code=409, detail="Checkout session not completed")
                    amount_total = checkout_session.get("amount_total")
                    if amount_total:
                        amount_cents = int(amount_total)
                    metadata = checkout_session.get("metadata") or {}
                    credit_meta = metadata.get("promotion_credit_amount") or metadata.get("credit_amount")
                    if credit_meta:
                        credit_cents = int(credit_meta)
                    if not promotion_id and metadata.get("promotion_id"):
                        promotion_id = int(metadata["promotion_id"])
                else:
                    if amount_cents is None:
                        raise HTTPException(status_code=400, detail="amount_cents required when session is unavailable")
                    if credit_cents is None:
                        credit_cents = amount_cents
        else:
            if amount_cents is None:
                raise HTTPException(status_code=400, detail="amount_cents required")
            if credit_cents is None:
                credit_cents = amount_cents

        if not amount_cents or amount_cents <= 0:
            raise HTTPException(status_code=400, detail="Invalid checkout amount")
        if not credit_cents or credit_cents <= 0:
            raise HTTPException(status_code=400, detail="Invalid credit amount")

        user.wallet_balance_cents = int(user.wallet_balance_cents or 0) + int(credit_cents)

        if promotion_id:
            promotion_record = _get_promotion(session, user.id, int(promotion_id))
            try:
                redeem_promotion(
                    session,
                    promotion_record,
                    amount=amount_cents / 100,
                    credit_amount=credit_cents / 100,
                    metadata=metadata,
                )
            except ValueError:
                pass

        session.add(user)
        session.commit()
        session.refresh(user)
        summary = _serialize_wallet_summary(session, user)
        return summary
    finally:
        session.close()
