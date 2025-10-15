from fastapi import APIRouter

router = APIRouter()

@router.get("/healthz")
def healthz():
    return {"ok": True}

@router.get("/readyz")
def readyz():
    # Replace with real dependency checks (DB, Redis, etc).
    return {"ready": True}
