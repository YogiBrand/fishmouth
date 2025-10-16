from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Any, Dict, List, Optional
import os
import httpx

from database import get_db
from models import Contractor, User
from auth import get_current_user
from services.ai.assistant_prompt import build_messages, requires_handoff

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


class RespondBody(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None
    quickAction: Optional[str] = None
    contextHints: Optional[Dict[str, Any]] = None


@router.get("/context")
async def get_context(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    contractor = db.query(Contractor).filter(Contractor.user_id == current_user.id).first()
    services_config = contractor.services_config if contractor else {}
    service_areas = contractor.service_areas if contractor else {}
    content_library = contractor.content_library if contractor else {}
    company_profile = {
        "name": getattr(current_user, "company_name", None),
        "brand_voice": (content_library or {}).get("brand_voice") or "professional helpful",
    }
    knowledge_snippets = (content_library or {}).get("knowledge") or []
    ai_default = os.getenv("ASSISTANT_DEFAULT_PROMPT_ID") or "cold_outreach_v1"
    return {
        "company_profile": company_profile,
        "services_config": services_config or {},
        "service_areas": service_areas or {},
        "knowledge_snippets": knowledge_snippets,
        "ai": {"prompt_id": ai_default},
    }


@router.post("/respond", response_model=None)
async def respond(
    body: RespondBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    stream: bool = False,
) -> Any:
    # Aggregate context
    base_ctx = await get_context(current_user, db)  # type: ignore[arg-type]
    # Allow prompt selection via contextHints.ai.prompt_id
    if body.contextHints:
        base_ctx.update(body.contextHints)

    # Build messages
    msgs = build_messages(body.message, body.history or [], base_ctx)

    # Call vLLM (OpenAI-compatible)
    base_url = os.getenv("VLLM_BASE_URL", "http://vllm:8000/v1")
    payload = {
        "model": os.getenv("ASSISTANT_MODEL", "local-gpu-model"),
        "messages": msgs,
        "temperature": float(os.getenv("ASSISTANT_TEMPERATURE", "0.4")),
        "max_tokens": int(os.getenv("ASSISTANT_MAX_TOKENS", "256")),
    }

    handoff = requires_handoff(body.message)

    if stream:
        async def _gen():
            # Stream tokens and flatten to plain text
            try:
                async with httpx.AsyncClient(timeout=None) as client:
                    async with client.stream("POST", f"{base_url}/chat/completions", json={**payload, "stream": True}) as r:
                        if r.status_code != 200:
                            yield ""  # no content
                            return
                        async for line in r.aiter_lines():
                            if not line:
                                continue
                            if line.startswith("data: "):
                                data_str = line[6:].strip()
                                if data_str == "[DONE]":
                                    break
                                try:
                                    obj = httpx.Response(200, json=None)  # dummy to keep linter calm
                                except Exception:
                                    pass
                                # naive parse without importing json to minimize deps
                                # attempt to extract delta content
                                try:
                                    import json as _json
                                    parsed = _json.loads(data_str)
                                    delta = ((parsed.get("choices") or [{}])[0].get("delta") or {})
                                    chunk = delta.get("content")
                                    if chunk:
                                        yield chunk
                                except Exception:
                                    # ignore malformed lines
                                    continue
            except Exception:
                # streaming failed silently
                return

        return StreamingResponse(_gen(), media_type="text/plain", headers={"X-Handoff": "true" if handoff else "false"})

    # Non-streaming path
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(f"{base_url}/chat/completions", json=payload)
        if r.status_code != 200:
            raise HTTPException(status_code=502, detail="assistant backend unavailable")
        data = r.json()
        content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "")

    # Clamp length
    content = (content or "").strip()
    if len(content) > 3000:
        content = content[:3000] + "…"

    return {"content": content, "handoff": handoff}


@router.post("/respond/stream")
async def respond_stream(body: RespondBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    base_ctx = await get_context(current_user, db)  # type: ignore[arg-type]
    if body.contextHints:
        base_ctx.update(body.contextHints)

    msgs = build_messages(body.message, body.history or [], base_ctx)
    base_url = os.getenv("VLLM_BASE_URL", "http://vllm:8000/v1")
    payload = {
        "model": os.getenv("ASSISTANT_MODEL", "local-gpu-model"),
        "messages": msgs,
        "temperature": float(os.getenv("ASSISTANT_TEMPERATURE", "0.4")),
        "max_tokens": int(os.getenv("ASSISTANT_MAX_TOKENS", "256")),
        "stream": True,
    }

    async def event_generator():
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", f"{base_url}/chat/completions", json=payload) as r:
                if r.status_code != 200:
                    yield b"data: {\"error\": \"assistant backend unavailable\"}\n\n"
                    return
                async for chunk in r.aiter_raw():
                    # Pass-through SSE bytes from vLLM
                    if chunk:
                        yield chunk

    return StreamingResponse(event_generator(), media_type="text/event-stream")

