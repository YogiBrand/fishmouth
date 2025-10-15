"""Unified token resolver shared across reports, email, and SMS flows."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional, Sequence

TOKEN_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_\.]+)\s*\}\}")
DEFAULTS: Dict[str, str] = {
    "lead.first_name": "Homeowner",
    "lead.full_name": "Homeowner",
    "company.name": "Your Roofing Co",
    "company.phone": "888-555-1212",
    "company.email": "hello@example.com",
}
ALLOWED_SCOPES = {"report", "email", "sms"}


@dataclass
class Resolution:
    """Result of resolving a template string."""

    text: str
    unresolved_tokens: List[str]


@dataclass
class StructuredResolution:
    """Resolution output for nested structures."""

    data: Any
    unresolved_tokens: List[str]


def _lookup(context: Mapping[str, Any], key: str) -> Any:
    parts = key.split(".")
    value: Any = context
    for part in parts:
        if isinstance(value, Mapping) and part in value:
            value = value[part]
        else:
            return DEFAULTS.get(key)
    return value


def resolve_text(template: str, context: Mapping[str, Any]) -> Resolution:
    """Resolve a single template string using the provided context."""
    if not isinstance(template, str):
        return Resolution(text=str(template), unresolved_tokens=[])

    unresolved: List[str] = []

    def _repl(match: re.Match[str]) -> str:
        token = match.group(1)
        if token == "now":
            return datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        value = _lookup(context, token)
        if value is None:
            unresolved.append(token)
            return f"[[{token}]]"
        return str(value)

    resolved = TOKEN_PATTERN.sub(_repl, template)
    # Remove duplicates while preserving order for unresolved warnings
    deduped: List[str] = []
    seen: set[str] = set()
    for item in unresolved:
        if item not in seen:
            deduped.append(item)
            seen.add(item)
    return Resolution(text=resolved, unresolved_tokens=deduped)


def resolve_structure(data: Any, context: Mapping[str, Any]) -> StructuredResolution:
    """Resolve tokens within arbitrarily nested structures."""
    unresolved: List[str] = []

    if isinstance(data, str):
        result = resolve_text(data, context)
        return StructuredResolution(data=result.text, unresolved_tokens=result.unresolved_tokens)

    if isinstance(data, Mapping):
        resolved_dict: Dict[str, Any] = {}
        for key, value in data.items():
            result = resolve_structure(value, context)
            resolved_dict[key] = result.data
            unresolved.extend(result.unresolved_tokens)
        return StructuredResolution(data=resolved_dict, unresolved_tokens=_dedupe(unresolved))

    if isinstance(data, list):
        resolved_list: List[Any] = []
        for item in data:
            result = resolve_structure(item, context)
            resolved_list.append(result.data)
            unresolved.extend(result.unresolved_tokens)
        return StructuredResolution(data=resolved_list, unresolved_tokens=_dedupe(unresolved))

    if isinstance(data, tuple):
        resolved_items: List[Any] = []
        for item in data:
            result = resolve_structure(item, context)
            resolved_items.append(result.data)
            unresolved.extend(result.unresolved_tokens)
        return StructuredResolution(data=tuple(resolved_items), unresolved_tokens=_dedupe(unresolved))

    return StructuredResolution(data=data, unresolved_tokens=[])


def compose_context(
    *,
    lead: Optional[Mapping[str, Any]] = None,
    company: Optional[Mapping[str, Any]] = None,
    report: Optional[Mapping[str, Any]] = None,
    business_profile: Optional[Mapping[str, Any]] = None,
    config: Optional[Mapping[str, Any]] = None,
    extra: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """Compose a hierarchical context for downstream template resolution."""
    context: Dict[str, Any] = {}

    if lead:
        context["lead"] = _enrich_lead(dict(lead))
    if company:
        context["company"] = dict(company)
    if business_profile:
        context["business_profile"] = dict(business_profile)
        profile_company = business_profile.get("company") if isinstance(business_profile, Mapping) else None
        if isinstance(profile_company, Mapping):
            context.setdefault("company", {}).update(profile_company)
    if report:
        context["report"] = dict(report)
    if config:
        context["config"] = dict(config)
    if extra:
        for key, value in extra.items():
            if value is None:
                continue
            context[key] = value

    return context


async def build_preview_context(
    db,
    *,
    lead_id: Optional[str] = None,
    report_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Load lead, report, and related data to assemble a preview context."""
    lead_data: Optional[Dict[str, Any]] = None
    report_data: Optional[Dict[str, Any]] = None
    business_profile: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None
    company_data: Dict[str, Any] = {}

    if report_id:
        report_row = await db.fetch_one(
            "SELECT id, lead_id, config, business_profile, share_url, pdf_url, preview_url FROM reports WHERE id = :id",
            {"id": report_id},
        )
        if report_row:
            report_data = dict(report_row)
            config = report_data.get("config") if isinstance(report_data.get("config"), Mapping) else None
            business_profile = report_data.get("business_profile") if isinstance(report_data.get("business_profile"), Mapping) else None
            lead_id = lead_id or report_data.get("lead_id")
            company_data.update(_company_from_business_profile(business_profile))

    if lead_id:
        lead_row = await db.fetch_one("SELECT * FROM leads WHERE id = :id", {"id": lead_id})
        if lead_row:
            lead_data = dict(lead_row)
            company_data.update(_company_from_lead(lead_data))

    if lead_data and lead_data.get("user_id"):
        user_row = await db.fetch_one("SELECT * FROM users WHERE id = :id", {"id": lead_data["user_id"]})
        if user_row:
            company_data.update(_company_from_user(dict(user_row)))

    context = compose_context(
        lead=lead_data,
        company=company_data or None,
        report=report_data,
        business_profile=business_profile,
        config=config,
    )
    return context


def _dedupe(tokens: Iterable[str]) -> List[str]:
    seen: set[str] = set()
    ordered: List[str] = []
    for token in tokens:
        if token not in seen:
            seen.add(token)
            ordered.append(token)
    return ordered


def _enrich_lead(lead: MutableMapping[str, Any]) -> MutableMapping[str, Any]:
    name = lead.get("homeowner_name") or lead.get("name")
    if isinstance(name, str) and name and "first_name" not in lead:
        lead["full_name"] = name
        lead["first_name"] = name.split()[0]
    address_parts: List[str] = []
    for key in ("address", "city", "state", "zip_code", "zip"):
        value = lead.get(key)
        if value:
            address_parts.append(str(value))
    if address_parts and "address_full" not in lead:
        # Remove duplicates in case zip+zip_code both present
        deduped: List[str] = []
        seen = set()
        for part in address_parts:
            if part not in seen:
                deduped.append(part)
                seen.add(part)
        lead["address_full"] = ", ".join(deduped)
    return lead


def _company_from_business_profile(profile: Optional[Mapping[str, Any]]) -> Dict[str, Any]:
    if not isinstance(profile, Mapping):
        return {}
    company = profile.get("company")
    if isinstance(company, Mapping):
        return dict(company)
    return {}


def _company_from_user(user: Optional[Mapping[str, Any]]) -> Dict[str, Any]:
    if not isinstance(user, Mapping):
        return {}
    company: Dict[str, Any] = {}
    if user.get("company_name"):
        company.setdefault("name", user["company_name"])
    if user.get("phone"):
        company.setdefault("phone", user["phone"])
    if user.get("email"):
        company.setdefault("email", user["email"])
    return company


def _company_from_lead(lead: Optional[Mapping[str, Any]]) -> Dict[str, Any]:
    if not isinstance(lead, Mapping):
        return {}
    company: Dict[str, Any] = {}
    if lead.get("assigned_contractor"):
        contractor = lead["assigned_contractor"]
        if isinstance(contractor, Mapping):
            if contractor.get("company_name"):
                company.setdefault("name", contractor["company_name"])
            for key in ("phone", "email", "marketing_contact_email"):
                if contractor.get(key):
                    company.setdefault(key.replace("marketing_contact_", ""), contractor[key])
    return company


def coerce_model_dict(obj: Any, columns: Optional[Sequence[str]] = None) -> Dict[str, Any]:
    """Convert SQLAlchemy models to dictionaries for token context usage."""
    if obj is None:
        return {}
    if isinstance(obj, Mapping):
        return dict(obj)
    if columns is None and hasattr(obj, "__table__"):
        columns = [col.name for col in obj.__table__.columns]
    data: Dict[str, Any] = {}
    if columns:
        for column in columns:
            data[column] = getattr(obj, column, None)
    else:
        for key in dir(obj):
            if key.startswith("_"):
                continue
            try:
                data[key] = getattr(obj, key)
            except AttributeError:
                continue
    return data
