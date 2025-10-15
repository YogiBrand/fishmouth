from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from boost.backend.services.messaging.shortlinks import create_shortlink, resolve_shortlink
from boost.backend.lib.events import emit_event

router = APIRouter(include_in_schema=True)

@router.get("/l/{code}")
def shortlink_redirect(code: str):
    target = resolve_shortlink(code)
    if not target:
        raise HTTPException(status_code=404, detail="invalid code")
    emit_event("message.clicked", {"code": code, "target": target})
    return RedirectResponse(url=target, status_code=302)
