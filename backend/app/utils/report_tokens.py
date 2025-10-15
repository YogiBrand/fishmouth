"""Wrappers around the unified token resolver for report content."""

from __future__ import annotations

from typing import Any, Dict, Mapping, Tuple

from app.lib import compose_context, resolve_structure, resolve_text

TokenMap = Dict[str, Any]


def build_token_map(
    *,
    lead: Mapping[str, Any] | None,
    business_profile: Mapping[str, Any] | None,
    config: Mapping[str, Any] | None,
) -> TokenMap:
    """Prepare a structured context for downstream token resolution."""
    company = None
    if isinstance(business_profile, Mapping):
        company_candidate = business_profile.get("company")
        if isinstance(company_candidate, Mapping):
            company = company_candidate
    return compose_context(
        lead=lead,
        business_profile=business_profile,
        company=company,
        config=config,
    )


def resolve_tokens_in_text(text: str, token_map: TokenMap) -> Tuple[str, Tuple[str, ...]]:
    """Resolve tokens inside a text string and capture unresolved references."""
    result = resolve_text(text, token_map)
    return result.text, tuple(result.unresolved_tokens)


def resolve_tokens(
    data: Any,
    token_map: TokenMap,
) -> Tuple[Any, Tuple[str, ...]]:
    """Recursively resolve tokens within complex data structures."""
    result = resolve_structure(data, token_map)
    return result.data, tuple(result.unresolved_tokens)


def resolve_report_tokens(
    *,
    content: Mapping[str, Any] | None,
    config: Mapping[str, Any] | None,
    lead: Mapping[str, Any] | None,
    business_profile: Mapping[str, Any] | None,
    include_unresolved: bool = False,
) -> Any | Tuple[Any, Tuple[str, ...]]:
    """Resolve all tokens in the report content using relevant context."""
    token_map = build_token_map(lead=lead, business_profile=business_profile, config=config)
    resolved = resolve_structure(content or {}, token_map)
    if include_unresolved:
        return resolved.data, tuple(resolved.unresolved_tokens)
    return resolved.data
