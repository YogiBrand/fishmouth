from __future__ import annotations
from typing import Any, Dict, List
from .prompt_library import load_prompt_yaml, render_prompt_augmentation


def build_system_prompt(brand_voice: str | None = None, prompt_id: str | None = None) -> str:
    voice = brand_voice or "friendly, concise, expert roofing assistant"
    base = (
        "You are Fish Mouth Assistant for roofing businesses. "
        f"Adopt this brand voice: {voice}. "
        "Always be concise, practical, and aligned with product capabilities. "
        "Refuse legal/medical/PII. If user requests refunds/billing or human, escalate."
    )
    if prompt_id:
        data = load_prompt_yaml(prompt_id)
        if data:
            base = base + "\n" + render_prompt_augmentation(data)
    return base


def build_context_blob(ctx: Dict[str, Any]) -> str:
    parts: List[str] = []
    prof = ctx.get("company_profile") or {}
    services = ctx.get("services_config") or {}
    areas = ctx.get("service_areas") or {}
    knowledge = ctx.get("knowledge_snippets") or []
    parts.append(f"Company: {prof.get('name') or 'N/A'} | Brand tone: {prof.get('brand_voice') or 'professional'}")
    items = (services.get("items") or [])[:20]
    if items:
        parts.append("Services:" + ", ".join([s.get("name", "?") for s in items[:12]]))
    if areas.get("items"):
        parts.append("Service areas:" + ", ".join(areas.get("items")[:10]))
    if knowledge:
        parts.append("Knowledge: " + "; ".join([k.get("title", "doc") for k in knowledge[:6]]))
    return "\n".join(parts)


def build_messages(user_message: str, history: List[Dict[str, str]] | None, ctx: Dict[str, Any]) -> List[Dict[str, str]]:
    system = build_system_prompt((ctx.get("company_profile") or {}).get("brand_voice"), (ctx.get("ai") or {}).get("prompt_id"))
    context_blob = build_context_blob(ctx)
    msgs: List[Dict[str, str]] = [{"role": "system", "content": system + "\nCONTEXT:\n" + context_blob}]
    if history:
        for h in history[-8:]:
            role = h.get("role")
            content = h.get("content")
            if role in ("user", "assistant") and content:
                msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": user_message})
    return msgs


def requires_handoff(text: str) -> bool:
    t = (text or "").lower()
    triggers = ["billing", "refund", "cancel", "human agent", "speak to someone", "support"]
    return any(k in t for k in triggers)


