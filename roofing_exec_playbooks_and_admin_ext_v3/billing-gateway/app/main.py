from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os, httpx

app = FastAPI(title="Billing Gateway (8032) — Stripe Stub")

STRIPE_KEY = os.getenv("STRIPE_SECRET_KEY","")

class CheckoutReq(BaseModel):
    user_id: str
    price_id: str
    success_url: str
    cancel_url: str

@app.get("/health")
def health(): return {"status":"ok"}

@app.post("/checkout")
async def checkout(c: CheckoutReq):
    if not STRIPE_KEY:
        raise HTTPException(400,"Missing STRIPE_SECRET_KEY")
    # In production: create Checkout Session via Stripe API
    return {"checkout_url": "https://example.com/stripe/checkout/stub"}
