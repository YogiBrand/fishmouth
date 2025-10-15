import re
from typing import Dict, List, Tuple, Any
from datetime import datetime

TOKEN_RE = re.compile(r"\{\{([a-zA-Z0-9_.]+)\}\}")

DEFAULTS = {
    "lead.first_name": "Homeowner",
    "company.name": "Your Roofing Co",
}

def _lookup(path: str, ctx: Dict[str, Any]) -> Any:
    cur: Any = ctx
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None
    return cur

def resolve_template(template: str, context: Dict[str, Any], defaults: Dict[str, Any] = None) -> Tuple[str, List[str]]:
    \"\"\"Resolve tokens like {{lead.first_name}} using a nested dict `context`.
    Returns (resolved_text, unresolved_tokens).
    \"\"\"
    defaults = {**DEFAULTS, **(defaults or {})}
    unresolved: List[str] = []

    def repl(m):
        key = m.group(1)
        if key == "now":
            return datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        val = _lookup(key, context)
        if val is None:
            # Fallback to defaults if available
            if key in defaults:
                return str(defaults[key])
            unresolved.append(key)
            return f"{{{{{key}}}}}"  # keep token visible
        return str(val)

    out = TOKEN_RE.sub(repl, template)
    # Deduplicate unresolved list
    unresolved_unique = sorted(set(unresolved))
    return out, unresolved_unique
