from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
from boost.backend.lib.tokens import resolve_template

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])

TEMPLATES: Dict[str, Dict[str, Any]] = {}  # id -> {scope, content, version, is_system}

class TemplateUpsert(BaseModel):
    scope: str  # 'report' | 'email' | 'sms'
    content: str
    is_system: bool = False

@router.get("")
def list_templates():
    return [{"id": k, **v} for k, v in TEMPLATES.items()]

@router.put("/{template_id}")
def upsert_template(template_id: str, t: TemplateUpsert):
    entry = TEMPLATES.get(template_id, {"version": 0})
    entry.update({"scope": t.scope, "content": t.content, "is_system": t.is_system, "version": entry["version"] + 1})
    TEMPLATES[template_id] = entry
    return {"id": template_id, **entry}

class PreviewRequest(BaseModel):
    template_id: str
    data: Dict[str, Any]

@router.post("/preview")
def preview(req: PreviewRequest):
    t = TEMPLATES.get(req.template_id)
    if not t:
        raise HTTPException(status_code=404, detail="template not found")
    out, unresolved = resolve_template(t["content"], req.data or {})
    return {"html": out, "unresolved_tokens": unresolved}
