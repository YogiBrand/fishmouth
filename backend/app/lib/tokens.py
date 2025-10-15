"""Compatibility wrappers for token resolution utilities."""

from __future__ import annotations

from typing import Any, Dict, Mapping, MutableMapping, Optional, Tuple

from .token_resolver import (
    DEFAULTS,
    Resolution,
    StructuredResolution,
    build_preview_context,
    coerce_model_dict,
    compose_context,
    resolve_structure,
    resolve_text,
)


def resolve_template(
    template: str,
    context: Mapping[str, Any],
    *,
    defaults: Optional[Mapping[str, Any]] = None,
) -> Tuple[str, list[str]]:
    """Return the rendered template text and unresolved tokens list."""

    result: Resolution = resolve_text(template, context)
    unresolved = list(result.unresolved_tokens)
    if defaults:
        # replace placeholders for tokens covered by provided defaults
        rendered = result.text
        for key, value in defaults.items():
            placeholder = f"[[{key}]]"
            if placeholder in rendered:
                rendered = rendered.replace(placeholder, str(value))
                if key in unresolved:
                    unresolved.remove(key)
        return rendered, unresolved
    return result.text, unresolved


__all__ = [
    "DEFAULTS",
    "build_preview_context",
    "coerce_model_dict",
    "compose_context",
    "resolve_structure",
    "resolve_template",
    "resolve_text",
]
