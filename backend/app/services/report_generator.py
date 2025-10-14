"""Report generation utilities for Fish Mouth property reports."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List, Optional

from app.core.config import get_settings
from app.core.database import get_db
from app.models import PropertyReport

import sqlalchemy as sa


logger = logging.getLogger(__name__)
settings = get_settings()


class ReportGeneratorService:
    """Generate narrative content and PDFs for property reports."""

    def __init__(self) -> None:
        self._reports_dir = Path("uploads") / "reports"
        self._reports_dir.mkdir(parents=True, exist_ok=True)

    async def generate_report_content(
        self,
        property_data: Dict[str, object],
        property_score: Optional[Dict[str, object]],
        contractor_data: Optional[Dict[str, object]],
        report_id: str,
    ) -> None:
        db = await get_db()
        try:
            summary = self._build_summary(property_data, property_score)
            recommendations = self._build_recommendations(property_score)
            damage_findings = self._build_damage_findings(property_score)
            cost_estimates = self._build_cost_estimates(property_score)
            neighborhood_context = self._build_neighborhood_context(property_score)
            branding_highlights = self._build_branding_highlights(contractor_data)

            payload = {
                "summary": summary,
                "recommendations": recommendations,
                "damage_findings": damage_findings,
                "cost_estimates": cost_estimates,
                "neighborhood_context": neighborhood_context,
                "branding": branding_highlights,
            }

            await db.execute(
                sa.update(PropertyReport)
                .where(PropertyReport.id == report_id)
                .values(
                    executive_summary=summary,
                    recommendations=recommendations,
                    damage_findings=damage_findings,
                    cost_estimates=cost_estimates,
                    urgency_level=self._derive_urgency(property_score),
                    report_payload=payload,
                    contractor_branding=branding_highlights,
                )
            )
            await db.commit()
        finally:
            await db.close()

    async def generate_pdf(
        self,
        property_data: Dict[str, object],
        property_score: Optional[Dict[str, object]],
        contractor_data: Optional[Dict[str, object]],
    ) -> str:
        filename = f"{property_data.get('id')}_report.pdf"
        filepath = self._reports_dir / filename

        try:
            from reportlab.lib.pagesizes import letter  # type: ignore
            from reportlab.pdfgen import canvas  # type: ignore
        except Exception as exc:  # noqa: BLE001
            logger.warning("report_generator.reportlab_missing", error=str(exc))
            filepath.write_text("ReportLab dependency missing. Install reportlab to enable PDF generation.\n")
            return f"/uploads/reports/{filename}"

        c = canvas.Canvas(str(filepath), pagesize=letter)
        width, height = letter
        c.setTitle("Fish Mouth Roof Assessment")

        y = height - 72
        c.setFont("Helvetica-Bold", 18)
        c.drawString(72, y, "Professional Roof Assessment")
        y -= 32

        c.setFont("Helvetica", 12)
        c.drawString(72, y, property_data.get("address", "Unknown Address"))
        y -= 18
        c.drawString(72, y, f"{property_data.get('city', '')}, {property_data.get('state', '')} {property_data.get('zip_code', '')}")
        y -= 24

        urgency = self._derive_urgency(property_score)
        c.setFont("Helvetica-Bold", 14)
        c.drawString(72, y, f"Urgency: {urgency.title() if urgency else 'N/A'}")
        y -= 24

        summary = self._build_summary(property_data, property_score)
        c.setFont("Helvetica", 11)
        for line in self._wrap_text(summary, 90):
            c.drawString(72, y, line)
            y -= 14
            if y < 72:
                c.showPage()
                y = height - 72
                c.setFont("Helvetica", 11)

        c.setFont("Helvetica-Bold", 13)
        c.drawString(72, y, contractor_data.get("company_name", "Your Roofing Partner"))
        y -= 18
        c.setFont("Helvetica", 10)
        c.drawString(72, y, contractor_data.get("contractor_branding", {}).get("tagline", "Certified roofing specialists."))
        y -= 14
        contact_line = f"Phone: {contractor_data.get('phone', 'N/A')}  •  Email: {contractor_data.get('marketing_contact_email', contractor_data.get('email', 'info@example.com'))}"
        c.drawString(72, y, contact_line)

        c.showPage()
        c.save()

        return f"/uploads/reports/{filename}"

    # ------------------------------------------------------------------
    # Content helpers
    # ------------------------------------------------------------------
    def _build_summary(self, property_data: Dict[str, object], property_score: Optional[Dict[str, object]]) -> str:
        score = (property_score or {}).get("total_urgency_score")
        tier = (property_score or {}).get("urgency_tier")
        roof_age = property_score.get("roof_age_years") if property_score else None
        permits = property_score.get("permits_within_quarter_mile") if property_score else None

        parts = [
            f"Fish Mouth analysed {property_data.get('address', 'the property')} alongside neighbourhood activity and financial signals.",
        ]
        if score is not None:
            parts.append(f"The current urgency score is {score}/100, placing the property in the '{tier or 'unknown'}' band.")
        if roof_age:
            parts.append(f"Estimated roof age is roughly {roof_age} years, based on available data.")
        if permits:
            parts.append(f"{permits} nearby homes pulled roofing permits in the last 90 days, indicating active replacements in the area.")
        return " ".join(parts)

    def _build_recommendations(self, property_score: Optional[Dict[str, object]]) -> Dict[str, str]:
        if not property_score:
            return {"action": "Review roof condition on-site to validate remote assessment."}
        tier = property_score.get("urgency_tier")
        mapping = {
            "ultra_hot": "Schedule an inspection immediately to secure crew availability while the neighbourhood momentum is high.",
            "hot": "Arrange a detailed inspection within the next 7 days to lock in neighbourhood pricing.",
            "warm": "Plan an inspection this month to stay ahead of potential wear.",
            "cold": "Monitor condition quarterly; no immediate action required.",
        }
        return {"action": mapping.get(tier, "Plan a follow-up inspection to confirm condition.")}

    def _build_damage_findings(self, property_score: Optional[Dict[str, object]]) -> Dict[str, object]:
        if not property_score:
            return {}
        return {
            "visible_damage_level": property_score.get("visible_damage_level", "unknown"),
            "nearest_permit": {
                "address": property_score.get("nearest_permit_address"),
                "distance_ft": property_score.get("nearest_permit_distance_ft"),
                "date": str(property_score.get("nearest_permit_date") or ""),
            },
        }

    def _build_cost_estimates(self, property_score: Optional[Dict[str, object]]) -> Dict[str, object]:
        if not property_score:
            return {}
        home_value = property_score.get("home_value") or 0
        if home_value:
            low = round(home_value * 0.02, 2)
            high = round(home_value * 0.04, 2)
            return {"estimated_range": [low, high], "basis": "2-4% of estimated home value"}
        return {}

    def _build_neighborhood_context(self, property_score: Optional[Dict[str, object]]) -> Dict[str, object]:
        if not property_score:
            return {}
        return {
            "permits_within_quarter_mile": property_score.get("permits_within_quarter_mile", 0),
            "permits_within_500ft": property_score.get("permits_within_500ft", 0),
            "same_subdivision_permits": property_score.get("same_subdivision_permits", 0),
        }

    def _build_branding_highlights(self, contractor_data: Optional[Dict[str, object]]) -> Dict[str, object]:
        if not contractor_data:
            return {}
        branding = contractor_data.get("contractor_branding") or {}
        palette = contractor_data.get("brand_palette") or {}
        return {
            "company_name": contractor_data.get("company_name"),
            "logo_url": contractor_data.get("logo_url"),
            "tagline": branding.get("tagline"),
            "materials": branding.get("materials"),
            "warranty": branding.get("warranty"),
            "case_studies": branding.get("case_studies", [])[:2],
            "testimonials": branding.get("testimonials", [])[:2],
            "palette": palette,
            "contact": {
                "phone": contractor_data.get("phone"),
                "email": contractor_data.get("marketing_contact_email") or contractor_data.get("email"),
                "website": contractor_data.get("website"),
            },
        }

    def _derive_urgency(self, property_score: Optional[Dict[str, object]]) -> Optional[str]:
        if not property_score:
            return None
        return property_score.get("urgency_tier")

    @staticmethod
    def _wrap_text(text: str, width: int) -> List[str]:
        words = text.split()
        if not words:
            return []
        lines: List[str] = []
        current: List[str] = []
        for word in words:
            current.append(word)
            if len(" ".join(current)) > width:
                current.pop()
                lines.append(" ".join(current))
                current = [word]
        if current:
            lines.append(" ".join(current))
        return lines
