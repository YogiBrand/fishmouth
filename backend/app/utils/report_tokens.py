"""Utility helpers for resolving templated tokens in enhanced report content."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, Mapping

TokenMap = Dict[str, Any]


def _flatten(obj: Any, prefix: str = "") -> TokenMap:
    """Flatten nested dictionaries into dot-delimited keys."""
    flattened: TokenMap = {}

    if obj is None:
        return flattened

    if isinstance(obj, Mapping):
        for key, value in obj.items():
            full_key = f"{prefix}.{key}" if prefix else str(key)
            flattened.update(_flatten(value, full_key))
    elif isinstance(obj, (list, tuple)):
        for index, item in enumerate(obj):
            full_key = f"{prefix}.{index}" if prefix else str(index)
            flattened.update(_flatten(item, full_key))
    else:
        if prefix:
            flattened[prefix] = obj

    return flattened


def build_token_map(
    *,
    lead: Mapping[str, Any] | None,
    business_profile: Mapping[str, Any] | None,
    config: Mapping[str, Any] | None,
) -> TokenMap:
    """Prepare a token map using lead, business profile, and report configuration."""
    tokens: TokenMap = {}

    if lead:
        tokens.update(_flatten(lead, "lead"))
        if lead.get("address"):
            parts = [
                lead.get("address"),
                lead.get("city"),
                lead.get("state"),
                lead.get("zip") or lead.get("zip_code"),
            ]
            tokens["lead.address_full"] = ", ".join(part for part in parts if part)
        if lead.get("homeowner_name") or lead.get("name"):
            tokens["lead.name"] = lead.get("homeowner_name") or lead.get("name")

    if business_profile:
        company = business_profile.get("company") if isinstance(business_profile, Mapping) else None
        branding = business_profile.get("branding") if isinstance(business_profile, Mapping) else None
        services = business_profile.get("services") if isinstance(business_profile, Mapping) else None

        if company:
            tokens.update(_flatten(company, "company"))
            if company.get("name"):
                tokens["company_name"] = company["name"]
        if branding:
            tokens.update(_flatten(branding, "branding"))
        if services:
            tokens.update(_flatten(services, "services"))

    if config:
        tokens.update(_flatten(config, "config"))

    now = datetime.utcnow()
    tokens["today"] = now.strftime("%B %d, %Y")
    tokens["now_iso"] = now.isoformat()

    return tokens


def resolve_tokens_in_text(text: str, token_map: TokenMap) -> str:
    """Replace templated tokens within a string."""
    if not isinstance(text, str):
        return text

    result = text
    cursor = 0

    while True:
        start = result.find("{{", cursor)
        if start == -1:
            break
        end = result.find("}}", start)
        if end == -1:
            break

        token_key = result[start + 2 : end].strip()
        replacement = token_map.get(token_key)
        if replacement is None:
            replacement_text = ""
        else:
            replacement_text = str(replacement)

        result = result[:start] + replacement_text + result[end + 2 :]
        cursor = start + len(replacement_text)

    return result


def resolve_tokens(
    data: Any,
    token_map: TokenMap,
) -> Any:
    """Recursively resolve tokens within complex data structures."""
    if isinstance(data, str):
        return resolve_tokens_in_text(data, token_map)

    if isinstance(data, Mapping):
        return {key: resolve_tokens(value, token_map) for key, value in data.items()}

    if isinstance(data, list):
        return [resolve_tokens(item, token_map) for item in data]

    if isinstance(data, tuple):
        return tuple(resolve_tokens(item, token_map) for item in data)

    return data


def resolve_report_tokens(
    *,
    content: Mapping[str, Any] | None,
    config: Mapping[str, Any] | None,
    lead: Mapping[str, Any] | None,
    business_profile: Mapping[str, Any] | None,
) -> Mapping[str, Any]:
    """Resolve all tokens in the report content using relevant context."""
    token_map = build_token_map(lead=lead, business_profile=business_profile, config=config)
    return resolve_tokens(content or {}, token_map)
