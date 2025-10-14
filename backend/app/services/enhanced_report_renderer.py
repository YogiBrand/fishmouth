"""HTML renderer for enhanced reports used for PDF generation and previews."""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Mapping, Tuple

from jinja2 import BaseLoader, Environment, select_autoescape

from app.utils.report_tokens import resolve_report_tokens


SECTION_TITLES = {
    "executive_summary": "Executive Summary",
    "property_overview": "Property Overview",
    "damage_analysis": "Damage Analysis",
    "inspection_findings": "Inspection Findings",
    "recommendations": "Recommendations",
    "maintenance_schedule": "Maintenance Schedule",
    "cost_estimates": "Cost Estimates",
    "before_after_gallery": "Before & After Gallery",
    "customer_story": "Customer Story",
    "testimonials": "Testimonials",
    "company_profile": "Company Profile",
    "next_steps": "Next Steps",
    "scope_of_work": "Scope of Work",
    "timeline": "Project Timeline",
    "materials_overview": "Materials Overview",
    "project_overview": "Project Overview",
    "challenges": "Challenges",
    "solutions": "Solutions",
    "results": "Results",
}


REPORT_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>{{ report_title }}</title>
    <style>
      @page {
        size: A4;
        margin: 32px 36px 40px 36px;
      }
      body {
        font-family: {{ font_family }};
        color: #1f2937;
        margin: 0;
        background-color: #f8fafc;
      }
      .report-wrapper {
        background: #ffffff;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.07);
        border: 1px solid rgba(148, 163, 184, 0.18);
      }
      header {
        padding: 32px 40px;
        border-bottom: 4px solid {{ accent_color }};
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.04), rgba(15, 118, 110, 0.04));
      }
      .lead-meta {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 32px;
      }
      .lead-meta h1 {
        margin: 0 0 6px 0;
        font-size: 30px;
        font-weight: 700;
      }
      .lead-meta p {
        margin: 2px 0;
        font-size: 13px;
        color: #475569;
      }
      .header-accent {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 12px;
      }
      .header-accent img {
        max-height: 56px;
        object-fit: contain;
      }
      .section {
        padding: 32px 40px;
        border-bottom: 1px solid rgba(226, 232, 240, 0.8);
      }
      .section h2 {
        font-size: 22px;
        margin: 0 0 16px 0;
        color: {{ accent_color }};
      }
      .section p {
        font-size: 13px;
        line-height: 1.6;
        margin: 0 0 12px 0;
        color: #334155;
      }
      .gallery {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 16px;
        margin-top: 12px;
      }
      .gallery figure {
        margin: 0;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.18);
      }
      .gallery img {
        width: 100%;
        height: 160px;
        object-fit: cover;
        display: block;
      }
      footer {
        padding: 28px 40px 36px 40px;
        background: radial-gradient(circle at top right, rgba(37, 99, 235, 0.09), transparent),
                    linear-gradient(135deg, {{ accent_color }}, {{ secondary_color }});
        color: #f8fafc;
      }
      footer p {
        margin: 4px 0;
        font-size: 12px;
      }
      .contact-pill {
        display: inline-block;
        margin: 4px 6px 0 0;
        padding: 6px 12px;
        border-radius: 999px;
        background-color: rgba(248, 250, 252, 0.16);
        font-size: 11px;
      }
    </style>
  </head>
  <body>
    <div class="report-wrapper">
      <header>
        <div class="lead-meta">
          <div>
            <h1>{{ report_title }}</h1>
            {% if lead_name %}
              <p><strong>Prepared for:</strong> {{ lead_name }}</p>
            {% endif %}
            {% if lead_address %}
              <p>{{ lead_address }}</p>
            {% endif %}
            {% if prepared_date %}
              <p>{{ prepared_date }}</p>
            {% endif %}
          </div>
          <div class="header-accent">
            {% if company_logo %}
              <img src="{{ company_logo }}" alt="Company logo" />
            {% endif %}
            <div>
              {% for line in company_contact %}
                <p>{{ line }}</p>
              {% endfor %}
            </div>
          </div>
        </div>
      </header>
      {% for section in sections %}
        <section class="section">
          <h2>{{ section.title }}</h2>
          {% for paragraph in section.paragraphs %}
            <p>{{ paragraph }}</p>
          {% endfor %}
          {% if section.is_gallery %}
            <div class="gallery">
              {% for image in gallery_images %}
                <figure>
                  <img src="{{ image.url }}" alt="{{ image.label or 'Report imagery' }}" />
                </figure>
              {% endfor %}
            </div>
          {% endif %}
        </section>
      {% endfor %}
      <footer>
        <p><strong>{{ company_name }}</strong></p>
        {% for line in footer_lines %}
          <p>{{ line }}</p>
        {% endfor %}
        <div style="margin-top: 8px;">
          {% for item in footer_contacts %}
            <span class="contact-pill">{{ item }}</span>
          {% endfor %}
        </div>
      </footer>
    </div>
  </body>
</html>
"""


class EnhancedReportRenderer:
    """Render enhanced reports into HTML with resolved tokens."""

    def __init__(self) -> None:
        self._environment = Environment(
            loader=BaseLoader(),
            autoescape=select_autoescape(["html", "xml"]),
            trim_blocks=True,
            lstrip_blocks=True,
        )
        self._template = self._environment.from_string(REPORT_TEMPLATE)

    def _normalise_paragraphs(self, value: Any) -> List[str]:
        if value is None:
            return []
        if isinstance(value, str):
            parts = [part.strip() for part in re.split(r"\n{2,}", value) if part.strip()]
            if not parts and value.strip():
                return [value.strip()]
            return parts
        if isinstance(value, Mapping):
            paragraphs: List[str] = []
            for nested in value.values():
                paragraphs.extend(self._normalise_paragraphs(nested))
            return paragraphs
        if isinstance(value, list):
            paragraphs: List[str] = []
            for item in value:
                paragraphs.extend(self._normalise_paragraphs(item))
            return paragraphs
        return [str(value)]

    def _build_sections(
        self,
        config: Mapping[str, Any] | None,
        resolved_content: Mapping[str, Any],
        gallery_present: bool,
    ) -> List[Dict[str, Any]]:
        sections_config = (config or {}).get("sections") or {}
        order = list(sections_config.keys()) or list(resolved_content.keys())

        sections: List[Dict[str, Any]] = []
        for key in order:
            settings = sections_config.get(key, {})
            if settings.get("enabled", True) is False:
                continue
            content = resolved_content.get(key)
            if content in (None, "", [], {}):
                continue

            section_data = {
                "id": key,
                "title": SECTION_TITLES.get(key, key.replace("_", " ").title()),
                "paragraphs": self._normalise_paragraphs(content),
                "is_gallery": key == "before_after_gallery" and gallery_present,
            }
            sections.append(section_data)

        return sections

    def render(
        self,
        *,
        config: Mapping[str, Any] | None,
        content: Mapping[str, Any] | None,
        business_profile: Mapping[str, Any] | None,
        lead: Mapping[str, Any] | None,
    ) -> Tuple[Mapping[str, Any], str]:
        """Resolve tokens and render the report to an HTML string."""

        resolved_content = resolve_report_tokens(
            content=content,
            config=config,
            lead=lead,
            business_profile=business_profile,
        )

        branding = (config or {}).get("branding") or {}
        custom = (config or {}).get("customizations") or {}
        company = (business_profile or {}).get("company") or {}

        accent_color = custom.get("accentColor") or branding.get("primaryColor") or "#2563eb"
        secondary_color = custom.get("secondaryColor") or branding.get("secondaryColor") or "#1f2937"
        font_family = branding.get("fontStyle") or "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

        gallery_images = []
        if lead and isinstance(lead, Mapping):
            imagery = lead.get("imagery")
            if isinstance(imagery, list):
                for item in imagery:
                    if not isinstance(item, Mapping):
                        continue
                    url = item.get("url") or item.get("src")
                    if url:
                        gallery_images.append({"url": url, "label": item.get("label")})
                    if len(gallery_images) >= 6:
                        break

        sections = self._build_sections(config, resolved_content, bool(gallery_images))

        lead_name = None
        if lead:
            lead_name = lead.get("homeowner_name") or lead.get("name")

        lead_address_parts = [
            lead.get("address") if lead else None,
            lead.get("city") if lead else None,
            lead.get("state") if lead else None,
            (lead.get("zip") or lead.get("zip_code")) if lead else None,
        ]
        lead_address = ", ".join(part for part in lead_address_parts if part)

        company_contact = [
            company.get("name"),
            company.get("phone"),
            company.get("email"),
            company.get("website"),
        ]
        company_contact = [item for item in company_contact if item]

        footer_lines = []
        if company.get("address"):
            footer_lines.append(company["address"])
        if company.get("tagline"):
            footer_lines.append(company["tagline"])

        footer_contacts = []
        if company.get("phone"):
            footer_contacts.append(company["phone"])
        if company.get("email"):
            footer_contacts.append(company["email"])
        if company.get("website"):
            footer_contacts.append(company["website"])

        prepared_date = (config or {}).get("prepared_at") or (config or {}).get("created_at")
        if not prepared_date:
            prepared_date = datetime.utcnow().strftime("%B %d, %Y")

        context = {
            "report_title": (config or {}).get("type", "Roofing Report").replace("-", " ").title(),
            "font_family": font_family,
            "accent_color": accent_color,
            "secondary_color": secondary_color,
            "lead_name": lead_name,
            "lead_address": lead_address,
            "prepared_date": prepared_date,
            "company_logo": (business_profile or {}).get("branding", {}).get("logo") if business_profile else None,
            "company_contact": company_contact,
            "company_name": company.get("name", "Your Roofing Partner"),
            "footer_lines": footer_lines,
            "footer_contacts": footer_contacts,
            "gallery_images": gallery_images,
            "sections": sections,
        }

        html = self._template.render(**context)
        return resolved_content, html


def ensure_reports_directory() -> Path:
    """Return the path to the reports directory, creating it if needed."""
    reports_dir = Path("uploads") / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    return reports_dir
