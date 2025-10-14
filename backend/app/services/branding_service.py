"""Branding toolkit utilities for contractor showcases and collateral."""

from __future__ import annotations

import secrets
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional

import sqlalchemy as sa

from app.core.config import get_settings
from app.core.database import get_db
from app.models import Contractor, ContractorShowcase

settings = get_settings()


class BrandingToolkitService:
    """Generates shareable assets and branded collateral for contractors."""

    @staticmethod
    async def get_contractor_profile(contractor_id: str) -> Optional[Dict[str, object]]:
        db = await get_db()
        try:
            row = await db.fetch_one(
                sa.text(
                    """
                    SELECT id, company_name, contact_name, phone, email, license_number,
                           website, logo_url, address, contractor_branding, brand_palette,
                           showcase_url, direct_mail_enabled, preferred_mail_templates
                    FROM contractors
                    WHERE id = :id
                    """
                ),
                {"id": contractor_id},
            )
            return dict(row) if row else None
        finally:
            await db.close()

    @staticmethod
    async def generate_showcase(contractor_id: str) -> Dict[str, object]:
        contractor = await BrandingToolkitService.get_contractor_profile(contractor_id)
        if not contractor:
            raise ValueError("Contractor not found")

        slug = secrets.token_urlsafe(12)
        base = settings.base_url or settings.frontend_url or "http://localhost:8000"
        share_url = f"{base.rstrip('/')}/uploads/showcases/{slug}.html"

        db = await get_db()
        try:
            await db.execute(
                sa.insert(ContractorShowcase).values(
                    contractor_id=contractor_id,
                    slug=slug,
                    share_url=share_url,
                    theme=contractor.get("brand_palette"),
                    last_generated_at=datetime.utcnow(),
                )
            )
            await db.execute(
                sa.update(Contractor)
                .where(Contractor.id == contractor_id)
                .values(showcase_url=share_url, updated_at=datetime.utcnow())
            )
            await db.commit()
        finally:
            await db.close()

        html = BrandingToolkitService._render_showcase_html(contractor, share_url)
        output_dir = Path("uploads/showcases")
        output_dir.mkdir(parents=True, exist_ok=True)
        html_path = output_dir / f"{slug}.html"
        html_path.write_text(html, encoding="utf-8")

        return {"slug": slug, "share_url": share_url, "html_path": str(html_path)}

    @staticmethod
    def _render_showcase_html(contractor: Dict[str, object], share_url: str) -> str:
        branding = contractor.get("contractor_branding") or {}
        palette = contractor.get("brand_palette") or {}
        primary = palette.get("primary", "#1e40af")
        accent = palette.get("accent", "#22d3ee")
        logo = contractor.get("logo_url") or "https://dummyimage.com/240x80/1e293b/ffffff&text=Your+Logo"
        case_studies = branding.get("case_studies", [])
        testimonials = branding.get("testimonials", [])

        case_blocks = "".join(
            f"""
            <div class='case-card'>
                <h3>{case.get('title', 'Featured Project')}</h3>
                <p>{case.get('summary', '')}</p>
                <ul>
                    <li>Neighborhood: {case.get('neighborhood', '—')}</li>
                    <li>Roof Type: {case.get('roof_type', '—')}</li>
                    <li>Completion: {case.get('completion_date', '—')}</li>
                </ul>
            </div>
            """
            for case in case_studies[:3]
        )

        testimonial_blocks = "".join(
            f"""
            <blockquote>
                <p>“{quote.get('quote', '')}”</p>
                <span>{quote.get('name', 'Homeowner')}</span>
            </blockquote>
            """
            for quote in testimonials[:3]
        )

        return f"""
        <!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta charset='UTF-8'>
            <meta name='viewport' content='width=device-width, initial-scale=1'>
            <title>{contractor.get('company_name')} • Roof Showcase</title>
            <style>
                :root {{
                    --primary: {primary};
                    --accent: {accent};
                }}
                body {{
                    margin: 0;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    background: #0f172a;
                    color: #e2e8f0;
                }}
                .hero {{
                    position: relative;
                    padding: 4rem 1.5rem 6rem;
                    background: linear-gradient(135deg, var(--primary), #0ea5e9);
                    text-align: center;
                }}
                .hero img {{ max-width: 260px; margin-bottom: 1.5rem; }}
                .hero h1 {{ font-size: 2.8rem; margin: 0 0 1rem; }}
                .section {{ max-width: 960px; margin: -3rem auto 3rem; background: #111c34; border-radius: 24px; padding: 2.5rem; box-shadow: 0 24px 60px rgba(15, 23, 42, 0.4); }}
                .section h2 {{ margin-top: 0; color: var(--accent); }}
                .grid {{ display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }}
                .case-card {{ background: rgba(15, 23, 42, 0.8); padding: 1.5rem; border-radius: 18px; border: 1px solid rgba(148, 163, 184, 0.1); }}
                blockquote {{ background: rgba(15, 23, 42, 0.8); border-left: 4px solid var(--accent); margin: 0; padding: 1.5rem; border-radius: 18px; }}
                footer {{ text-align: center; color: #94a3b8; margin-bottom: 2rem; }}
                .cta {{ display: inline-block; background: var(--accent); color: #0f172a; padding: 0.9rem 2.4rem; border-radius: 999px; font-weight: 700; text-decoration: none; margin-top: 2rem; }}
            </style>
        </head>
        <body>
            <header class='hero'>
                <img src='{logo}' alt='{contractor.get('company_name')} logo'>
                <h1>{contractor.get('company_name')}</h1>
                <p>{branding.get('tagline', 'Leading roof replacement specialists for your neighborhood.')}</p>
                <a class='cta' href='tel:{contractor.get('phone', '')}'>Call {contractor.get('phone', '')}</a>
            </header>

            <section class='section'>
                <h2>Recent Neighborhood Success</h2>
                <div class='grid'>
                    {case_blocks or '<div class="case-card"><h3>Roof Replacement Success</h3><p>Ask us about recent installs in your neighborhood. Our crews are already nearby.</p></div>'}
                </div>
            </section>

            <section class='section'>
                <h2>Homeowner Testimonials</h2>
                <div class='grid'>
                    {testimonial_blocks or '<blockquote><p>“The team was professional, fast, and the new roof looks incredible.”</p><span>Happy Homeowner</span></blockquote>'}
                </div>
            </section>

            <section class='section'>
                <h2>Why Homeowners Choose Us</h2>
                <div class='grid'>
                    <div class='case-card'>
                        <h3>AI Roof Analysis</h3>
                        <p>Real-time contagion scoring finds the hottest opportunities and keeps your crews busy.</p>
                    </div>
                    <div class='case-card'>
                        <h3>Premium Materials</h3>
                        <p>{branding.get('materials', 'Owens Corning & GAF shingles available in architectural and designer options.')}</p>
                    </div>
                    <div class='case-card'>
                        <h3>Warranty & Financing</h3>
                        <p>{branding.get('warranty', '25-year workmanship warranty with flexible financing options starting at 0% APR.')}</p>
                    </div>
                </div>
            </section>

            <footer>
                <p>{contractor.get('address', '')}</p>
                <p>Lic #{contractor.get('license_number', 'N/A')} • {contractor.get('marketing_contact_email', contractor.get('email', 'info@example.com'))}</p>
                <p>Shareable link: {share_url}</p>
            </footer>
        </body>
        </html>
        """
