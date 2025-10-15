# boost/backend/lib/tokens.py
from typing import Dict, Any, Tuple, List
import re
from datetime import datetime
TOKEN_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}")
DEFAULTS = {"lead.first_name":"Homeowner","company.name":"Your Roofing Co"}

def resolve(template: str, ctx: Dict[str, Any]) -> Tuple[str, List[str]]:
    unresolved: List[str] = []
    def repl(m):
        key = m.group(1)
        if key == "now":
            return datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        parts, v = key.split("."), ctx
        for p in parts:
            if isinstance(v, dict) and p in v:
                v = v[p]
            else:
                v = DEFAULTS.get(key, None)
                break
        if v is None:
            unresolved.append(key)
            return f"[[{key}]]"
        return str(v)
    out = TOKEN_RE.sub(repl, template)
    return out, unresolved
