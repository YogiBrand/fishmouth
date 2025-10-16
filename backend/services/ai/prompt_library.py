from __future__ import annotations
import os
from typing import Any, Dict, Optional


def _read_file(path: str) -> Optional[str]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return None


def load_prompt_yaml(prompt_id: str) -> Optional[Dict[str, Any]]:
    import yaml  # type: ignore

    search_roots = [
        os.getenv("PROMPT_DIR", "/shared/prompts"),
        os.path.join(os.path.dirname(__file__), "prompts"),
    ]
    for root in search_roots:
        if not root or not os.path.isdir(root):
            continue
        try:
            for name in os.listdir(root):
                if not name.endswith(".yaml") and not name.endswith(".yml"):
                    continue
                full = os.path.join(root, name)
                text = _read_file(full)
                if not text:
                    continue
                try:
                    data = yaml.safe_load(text) or {}
                except Exception:
                    continue
                if isinstance(data, dict) and data.get("id") == prompt_id:
                    return data  # type: ignore[return-value]
        except Exception:
            continue
    return None


def render_prompt_augmentation(prompt: Dict[str, Any]) -> str:
    persona = prompt.get("persona") or prompt.get("role") or "Expert assistant"
    goal = prompt.get("goal") or ""
    instructions = prompt.get("instructions") or ""
    examples = prompt.get("examples") or []
    output_schema = prompt.get("output_schema") or {}

    parts = [
        f"Persona: {persona}",
        f"Goal: {goal}",
        "Instructions:",
        str(instructions).strip(),
    ]
    if examples:
        parts.append("Examples:")
        for ex in examples[:3]:
            parts.append(f"- {ex}")
    if output_schema:
        parts.append("Output format (strict):")
        parts.append(str(output_schema))
    return "\n".join(p for p in parts if p)


