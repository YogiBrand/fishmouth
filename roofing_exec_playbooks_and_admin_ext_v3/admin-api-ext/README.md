# Add these imports and router includes to your existing FastAPI app (admin-api-8031).
# If replacing file, ensure routes below are exposed.

from fastapi import FastAPI
from .routes_messaging import router as messaging_router
from .routes_queues import router as queues_router

def init_routes(app: FastAPI):
    app.include_router(messaging_router, prefix="")
    app.include_router(queues_router, prefix="")
