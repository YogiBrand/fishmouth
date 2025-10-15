"""Utilities for generating polished report copy using OpenRouter or fallbacks."""

from __future__ import annotations

import hashlib
import json
import logging
import time
from typing import Any, Dict, Optional, Tuple

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_SETTINGS = get_settings()
_DEFAULT_MODEL = "meta-llama/llama-3.1-8b-instruct:free"
_OPENROUTER_BASE_URL = (_SETTINGS.providers.openrouter_base_url or "https://openrouter.ai/api/v1").rstrip("/")


class ReportContentGenerator:
    """Generate section-level report copy with graceful fallbacks."""

    def __init__(self) -> None:
        self._api_key = _SETTINGS.providers.openrouter_api_key
        self._model = _DEFAULT_MODEL
        self._timeout = max(_SETTINGS.http_timeout_seconds or 20, 20)

    async def generate_section(
        self,
        section: str,
        prompt: str,
        context: Dict[str, Any],
    ) -> Tuple[str, Dict[str, Any]]:
        """Generate copy for a report section.

        Returns a tuple of (content, metadata).
        """

        started = time.perf_counter()
        content: Optional[str] = None
        meta: Dict[str, Any] = {"model": None, "tokens": None, "duration_ms": None}

        if self._api_key:
            try:
                payload = self._build_payload(prompt, context)
                headers = {
                    "Authorization": f"Bearer {self._api_key}",
                    "HTTP-Referer": "https://app.fishmouth.ai",
                    "X-Title": "FishMouth Reports",
                }
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    response = await client.post(
                        f"{_OPENROUTER_BASE_URL}/chat/completions",
                        headers=headers,
                        json=payload,
                    )
                    response.raise_for_status()
                data = response.json()
                content = self._extract_text(data)
                usage = data.get("usage") or {}
                meta.update(
                    {
                        "model": data.get("model") or payload.get("model"),
                        "tokens": usage.get("total_tokens"),
                    }
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("report_content_generator.openrouter_failed", exc_info=exc)

        if not content:
            content = self._fallback(section, context)
            meta.update({"model": "fallback-template", "tokens": 0})

        meta["duration_ms"] = int((time.perf_counter() - started) * 1000)
        return content.strip(), meta

    def _build_payload(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        serialised_context = json.dumps(context, default=self._json_default, sort_keys=True)
        user_prompt = (
            f"{prompt.strip()}\n\n"
            f"Context JSON:\n{serialised_context}\n\n"
            "Return polished paragraph copy tailored to this homeowner."
        )
        system_prompt = (
            "You are Fish Mouth's senior roofing copywriter. "
            "Write clear, confident marketing copy that blends inspection detail with persuasive narrative. "
            "Keep language homeowner-friendly, avoid over-selling, and weave in relevant stats from the context when available."
        )
        return {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "temperature": 0.6,
            "max_tokens": 650,
        }

    @staticmethod
    def _extract_text(payload: Dict[str, Any]) -> str:
        choices = payload.get("choices") or []
        if not choices:
            return ""
        message = choices[0].get("message") or {}
        content = message.get("content")
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "\n".join(
                part.get("text", "") if isinstance(part, dict) else str(part)
                for part in content
                if part
            )
        return str(content or "")

    def _fallback(self, section: str, context: Dict[str, Any]) -> str:
        lead = context.get("property_data") or {}
        business = (context.get("business_profile") or {}).get("company", {})
        services = (context.get("business_services") or {}).get("summary") or {}

        homeowners_name = lead.get("homeowner_name") or lead.get("name") or "the homeowner"
        address = lead.get("address") or "this property"

        if section == "executive_summary":
            return (
                f"We evaluated {address} and found a roof that can benefit from proactive attention. "
                "Our neighbourhood analytics, roof intelligence overlays, and on-the-ground inspections all point to a clear, action-oriented path forward."  # noqa: E501
            )

        if section == "property_overview":
            city_state = ", ".join(filter(None, [lead.get("city"), lead.get("state")]))
            roof_age = lead.get("roof_age_years")
            roof_material = lead.get("roof_material")
            ancil = []
            if roof_age:
                ancil.append(f"estimated roof age of {roof_age} years")
            if roof_material:
                ancil.append(f"premium {roof_material} surfaces")
            descriptor = " with " + " and ".join(ancil) if ancil else ""
            return (
                f"{address} in {city_state or 'the neighbourhood'} is a standout home{descriptor}. "
                "Satellite imagery and curbside angles confirm clean roof lines, active ventilation, and a layout well-suited for fast staging."  # noqa: E501
            )

        if section == "damage_analysis":
            overlays = lead.get("ai_analysis", {}).get("summary")
            return overlays or (
                "Thermal overlays highlight developing wear on the slopes that take the brunt of afternoon sun and prevailing weather. "
                "Granule loss, minor lifting, and weather scoring are present, signalling the right moment to intervene before leaks appear."
            )

        if section == "recommendations":
            return (
                "Book a guided inspection to confirm AI findings, document high-resolution imagery for insurance leverage, and schedule repairs before the peak storm cycle. "
                "Locking in pricing now protects against material surcharges and keeps scheduling flexible around the homeowner's calendar."
            )

        if section == "cost_estimates":
            inspections = services.get("inspections") or {}
            repairs = services.get("repairs") or {}
            lines = [
                "We base all estimates on your published pricing and recent neighbourhood projects.",
            ]
            if inspections:
                basic = inspections.get("basic") or {}
                comp = inspections.get("comprehensive") or {}
                if basic.get("price") or comp.get("price"):
                    lines.append(
                        "Professional roof inspection: "
                        + " / ".join(
                            filter(
                                None,
                                [
                                    basic.get("price") and f"Standard $${basic['price']}",
                                    comp.get("price") and f"Diagnostic $${comp['price']}",
                                ],
                            )
                        )
                    )
            if repairs:
                minor = repairs.get("minor") or {}
                major = repairs.get("major") or {}
                if minor.get("priceRange"):
                    lines.append(
                        f"Priority tune-up repairs typically sit between ${minor['priceRange'][0]} and ${minor['priceRange'][1]}."
                    )
                if major.get("priceRange"):
                    lines.append(
                        f"Full slope replacement projects range ${major['priceRange'][0]}-${major['priceRange'][1]}, depending on materials."
                    )
            lines.append("All pricing is verified during inspection and backed by transparent scopes of work.")
            return " ".join(lines)

        if section == "next_steps":
            company = business.get("name") or "our team"
            phone = business.get("phone") or "your project specialist"
            return (
                f"Schedule a 45-minute site visit so {company} can capture measurements, review financing, and lock in the production calendar. "
                f"Call {phone} or reply to this report to pick a time that works for the homeowner."
            )

        if section == "company_profile":
            company = business.get("name") or "Our company"
            tagline = business.get("tagline") or "Trusted roofing experts"
            years = business.get("yearsInBusiness") or business.get("years_in_business")
            highlights = [
                f"{company} — {tagline}.",
                "Certified, insured, and local to this neighbourhood.",
            ]
            if years:
                highlights.append(f"Serving homeowners for over {years} years.")
            return " ".join(highlights)

        if section == "testimonials":
            testimonials = (context.get("business_profile") or {}).get("caseStudies", {}).get("testimonials") or []
            if testimonials:
                snippets = [
                    f"\u201c{entry.get('quote', '').strip()}\u201d — {entry.get('name', 'Homeowner')}"
                    for entry in testimonials[:3]
                    if entry.get("quote")
                ]
                return "\n\n".join(snippets)
            return (
                "Homeowners consistently cite rapid response times, clean job sites, and insurance-ready documentation as the reasons they recommend us."
            )

        if section == "timeline":
            return (
                "Day 1: Confirm inspection findings and finalise material selections.\n"
                "Day 2: Stage crews, deliver materials, and protect landscaping.\n"
                "Day 3: Tear-off, deck prep, and dry-in the roof system.\n"
                "Day 4: Install final surfaces, paint accessories, and complete QA walkthrough."
            )

        if section == "scope_of_work":
            return (
                "Full tear-off of aging shingles, deck inspection, underlayment upgrades, and installation of premium lifetime shingles. "
                "Includes new flashing, ridge ventilation, and haul-off of all debris with magnetic yard sweep."
            )

        if section == "materials_overview":
            return (
                "We specify Class 3 impact-rated shingles, synthetic underlayment, ice and water barriers on eaves and valleys, and colour-matched accessories. "
                "All components are manufacturer-approved to protect warranties."
            )

        if section == "inspection_findings":
            findings = lead.get("ai_analysis", {}).get("damage_indicators") or lead.get("damage_indicators") or []
            if findings:
                formatted = ", ".join(f.replace("_", " ") for f in findings)
                return (
                    f"Initial review detected {formatted}. A guided inspection will document these areas in detail, including photos and moisture readings."
                )
            return (
                "Elevation photos show granule erosion, nail pop uplift, and active sealant fatigue on penetrations. We recommend hands-on confirmation."
            )

        if section == "maintenance_schedule":
            return (
                "Every 6 months: clean gutters, inspect penetrations, and reset sealant.\n"
                "Yearly: soft wash roof surfaces to remove organic staining.\n"
                "After major storms: request a drone scan to compare against this baseline report."
            )

        if section == "project_overview":
            return (
                "This proposal outlines a turnkey roof replacement engineered to boost curb appeal, lock in insurance compliance, and protect the homeowner for the next 25+ years."
            )

        if section == "challenges":
            return (
                "Steep pitches and limited driveway space require strategic staging. Weather windows in this area can be tight, so proactive scheduling keeps the job on track."
            )

        if section == "solutions":
            return (
                "We deploy specialised tear-off crews, equip harnessed installers, and stage materials in bundles to keep the property accessible while work proceeds efficiently."
            )

        if section == "results":
            return (
                "Homeowners enjoy upgraded shingles with transferable warranties, improved ventilation, and a documented gallery of before/after imagery ready for insurance or resale."
            )

        if section == "customer_story":
            return (
                f"{homeowners_name} wanted a roof partner that handled insurance headaches and kept the project stress-free. "
                "Our team managed the claim paperwork, completed the build in two days, and left the property spotless."
            )

        return (
            "This section is ready for tailored messaging once additional details are provided."
        )

    @staticmethod
    def _json_default(value: Any) -> Any:
        if isinstance(value, (set, tuple)):
            return list(value)
        return str(value)


def build_prompt_signature(section: str, prompt: str, context: Dict[str, Any]) -> str:
    """Create a stable hash for caching AI generations."""

    relevant = {
        "section": section,
        "prompt": prompt.strip(),
        "report_type": context.get("report_type"),
        "business": (context.get("business_profile") or {}).get("company", {}).get("name"),
        "services_version": (context.get("business_services") or {}).get("fingerprint"),
    }
    serialised = json.dumps(relevant, sort_keys=True, default=str)
    return hashlib.sha256(serialised.encode("utf-8")).hexdigest()
