#!/usr/bin/env python3
"""Seed the Fish Mouth database with connected demo data."""

from __future__ import annotations

import math
import random
import uuid
from datetime import datetime, timedelta

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import insert

from app.core.config import get_settings
from app.core.database import get_db
from app.models import (
    BuildingPermit,
    CallCampaign,
    ContagionCluster,
    Contractor,
    ContractorShowcase,
    MailCampaign,
    MailJob,
    Property,
    PropertyReport,
    PropertyScore,
    ScheduledSMS,
    SocialProofData,
)

settings = get_settings()

BRANDING = {
    "tagline": "Precision roofing powered by AI contagion insights.",
    "materials": "Owens Corning Duration, GAF Timberline HDZ, metal standing seam",
    "warranty": "25-year workmanship warranty + lifetime material coverage",
    "case_studies": [
        {
            "title": "Lake Vista Hail Restoration",
            "summary": "Replaced 18 roofs in HOA using Class-4 impact shingles with zero change orders.",
            "neighborhood": "Lake Vista",
            "roof_type": "Architectural Shingle",
            "completion_date": "June 2024",
        },
        {
            "title": "Hilltop Estates Metal Upgrade",
            "summary": "Converted cedar shake subdivision to energy-efficient standing seam metal roofs.",
            "neighborhood": "Hilltop Estates",
            "roof_type": "Standing Seam Metal",
            "completion_date": "March 2024",
        },
    ],
    "testimonials": [
        {"name": "Jessica R.", "quote": "They handled everything from drone inspection to insurance. Zero stress."},
        {"name": "Marcus L.", "quote": "Our entire cul-de-sac used them. Crews were professional and fast."},
    ],
}

PALETTE = {"primary": "#1d4ed8", "accent": "#22d3ee"}
TEMPLATES = ["impact", "heritage", "storm_alert"]

CITIES = [
    ("Frisco", "TX"),
    ("Plano", "TX"),
    ("Allen", "TX"),
    ("McKinney", "TX"),
    ("Prosper", "TX"),
]

PERMIT_TYPES = ["Roof Replacement", "Roof Repair", "Hail Damage Replacement"]


def random_address(city: str, state: str) -> dict:
    street_number = random.randint(200, 9999)
    street_name = random.choice([
        "Oak Bluff", "Silver Leaf", "Heritage Way", "Canyon Vista", "Sunset Ridge",
        "Bluebonnet Trail", "Cedar Crest", "Amber Falls", "Summit Glen", "River Bend",
    ])
    return {
        "address": f"{street_number} {street_name}",
        "city": city,
        "state": state,
        "zip_code": f"{random.randint(75000, 75099)}",
    }


def make_uuid() -> uuid.UUID:
    return uuid.uuid4()


def build_permit(property_data: dict, days_back: int = 45) -> dict:
    issued = datetime.utcnow() - timedelta(days=random.randint(1, days_back))
    return {
        "address": property_data["address"],
        "city": property_data["city"],
        "state": property_data["state"],
        "zip_code": property_data["zip_code"],
        "latitude": property_data["latitude"],
        "longitude": property_data["longitude"],
        "permit_number": f"PR-{random.randint(100000, 999999)}",
        "permit_date": issued.date(),
        "permit_type": random.choice(PERMIT_TYPES),
        "permit_value": random.randint(18000, 35000),
        "contractor_name": "Fish Mouth Roofing Demo",
        "contractor_license": "RC-458921",
        "work_description": "Full tear-off and replacement using impact-resistant architectural shingles.",
        "subdivision_name": property_data.get("subdivision_name"),
        "source_url": "https://example.gov/permits",
    }


def score_property(property_id: uuid.UUID, property_data: dict, cluster: dict) -> dict:
    contagion = random.randint(20, 40)
    financial = random.randint(10, 20)
    age = random.randint(10, 25)
    visual = random.randint(5, 12)
    total = contagion + financial + age + visual
    tier = "ultra_hot" if total >= 90 else "hot" if total >= 70 else "warm"
    return {
        "property_id": property_id,
        "cluster_id": cluster["id"],
        "contagion_score": contagion,
        "permits_within_quarter_mile": random.randint(3, 9),
        "permits_within_500ft": random.randint(1, 4),
        "same_subdivision_permits": random.randint(1, 5),
        "nearest_permit_distance_ft": random.randint(45, 320),
        "nearest_permit_address": property_data["address"],
        "nearest_permit_date": datetime.utcnow().date() - timedelta(days=random.randint(1, 30)),
        "age_match_score": age,
        "year_built": property_data["year_built"],
        "roof_age_years": datetime.utcnow().year - property_data["year_built"],
        "matches_neighbor_age": True,
        "financial_score": financial,
        "home_value": property_data["estimated_value"],
        "estimated_equity_percent": random.randint(35, 60),
        "visual_score": visual,
        "has_aerial_analysis": True,
        "total_urgency_score": total,
        "urgency_tier": tier,
        "confidence_level": "high",
        "recommended_action": "schedule_this_week",
        "scored_at": datetime.utcnow(),
    }


def make_property(city: str, state: str) -> dict:
    lat = round(33.0 + random.random(), 6)
    lng = round(-96.7 + random.random(), 6)
    address_info = random_address(city, state)
    year_built = random.randint(1995, 2012)
    est_value = random.randint(325000, 780000)
    return {
        "id": make_uuid(),
        "address": address_info["address"],
        "city": city,
        "state": state,
        "zip_code": address_info["zip_code"],
        "latitude": lat,
        "longitude": lng,
        "street_number": address_info["address"].split(" ")[0],
        "street_name": " ".join(address_info["address"].split(" ")[1:]),
        "subdivision_name": f"{city} Oaks",
        "parcel_id": f"PAR-{random.randint(10000, 99999)}",
        "lot_size_sqft": random.randint(5500, 9800),
        "year_built": year_built,
        "estimated_value": est_value,
        "equity_percent": random.randint(35, 65),
        "roof_age_years": datetime.utcnow().year - year_built,
        "roof_material": random.choice(["Architectural Shingle", "Metal", "Tile"]),
        "owner_name": f"{random.choice(['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey'])} {random.choice(['Smith', 'Garcia', 'Brown', 'Martinez'])}",
        "owner_phone": f"(972) {random.randint(200, 999)}-{random.randint(1000, 9999)}",
        "owner_email": "homeowner@example.com",
        "lead_status": random.choice(["new", "contacted", "appointment_booked"]),
        "appointment_date": datetime.utcnow() + timedelta(days=random.randint(1, 14)),
        "created_at": datetime.utcnow() - timedelta(days=random.randint(1, 60)),
    }


def create_demo_data() -> None:
    random.seed(42)
    contractor_id = make_uuid()

    contractor_values = {
        "id": contractor_id,
        "company_name": "Skyline Roofing & Restoration",
        "contact_name": "Jamie Porter",
        "phone": "(972) 555-0148",
        "email": "hello@skylineroofing.com",
        "license_number": "RC-458921",
        "website": "https://skylineroofing.com",
        "logo_url": "https://dummyimage.com/240x80/0f172a/22d3ee&text=Skyline",
        "address": "2211 Windcrest Blvd, Frisco, TX",
        "contractor_branding": BRANDING,
        "brand_palette": PALETTE,
        "direct_mail_enabled": True,
        "preferred_mail_templates": TEMPLATES,
        "marketing_contact_email": "marketing@skylineroofing.com",
        "marketing_contact_phone": "(972) 555-0199",
        "created_at": datetime.utcnow() - timedelta(days=30),
    }

    async def _run():
        db = await get_db()
        try:
            await db.execute(sa.text("TRUNCATE contractor_showcases, mail_jobs, mail_campaigns, property_reports, social_proof_data, property_scores, contagion_clusters, building_permits, properties, call_campaigns, ai_calls, scheduled_sms RESTART IDENTITY CASCADE"))
            await db.execute(sa.text("DELETE FROM contractors"))

            await db.execute(sa.insert(Contractor).values(**contractor_values))

            properties = []
            for city, state in CITIES:
                for _ in range(8):
                    properties.append(make_property(city, state))

            await db.execute(sa.insert(Property), properties)

            cluster_entries = []
            for idx, (city, state) in enumerate(CITIES):
                cluster_entries.append({
                    "id": make_uuid(),
                    "city": city,
                    "state": state,
                    "center_latitude": round(33.0 + idx * 0.05, 6),
                    "center_longitude": round(-96.8 + idx * 0.05, 6),
                    "permit_count": random.randint(8, 25),
                    "avg_permit_value": random.randint(19000, 32000),
                    "radius_miles": 0.35,
                    "cluster_score": random.randint(70, 95),
                    "cluster_status": random.choice(["active", "warming", "cooling"]),
                    "date_range_start": datetime.utcnow().date() - timedelta(days=45),
                    "date_range_end": datetime.utcnow().date(),
                    "metadata": {"top_permits": random.randint(3, 9)},
                })

            await db.execute(sa.insert(ContagionCluster), cluster_entries)

            cluster_cycle = cluster_entries * math.ceil(len(properties) / len(cluster_entries))
            property_scores = []
            permits = []
            reports = []
            socials = []
            sms_records = []
            for property_data, cluster in zip(properties, cluster_cycle):
                property_scores.append(score_property(property_data["id"], property_data, cluster))
                permits.append(build_permit(property_data))
                reports.append({
                    "id": make_uuid(),
                    "property_id": property_data["id"],
                    "contractor_id": contractor_id,
                    "report_type": "full_analysis",
                    "report_title": f"Roof Assessment - {property_data['address']}",
                    "executive_summary": "AI contagion analysis indicates elevated roof replacement activity in your subdivision.",
                    "damage_findings": {"nearest_permit": permits[-1]["permit_number"]},
                    "recommendations": {"action": "Schedule inspection within 5 days"},
                    "generated_at": datetime.utcnow(),
                })
                socials.append({
                    "id": make_uuid(),
                    "property_id": property_data["id"],
                    "neighbor_addresses": [f"{random.randint(100,999)} {property_data['street_name']}", f"{random.randint(100,999)} {property_data['street_name']}"],
                    "neighbor_replacement_dates": [datetime.utcnow().date() - timedelta(days=random.randint(5, 40))],
                    "neighbor_contractor_names": ["Skyline Roofing"],
                    "neighbor_permit_values": [random.randint(18000, 32000)],
                    "hoa_name": f"{property_data['subdivision_name']} HOA",
                    "community_reputation_score": random.randint(70, 95),
                    "updated_at": datetime.utcnow(),
                })
                sms_records.append({
                    "id": make_uuid(),
                    "lead_id": property_data["id"],
                    "message": "Reminder: crews are on your street this week. Reply YES for a free roof inspection.",
                    "send_at": datetime.utcnow() - timedelta(hours=random.randint(8, 36)),
                    "provider": "telnyx",
                    "delivery_status": random.choice(["sent", "delivered"]),
                    "telnyx_message_id": f"MSG-{random.randint(100000,999999)}",
                    "delivered_at": datetime.utcnow() - timedelta(hours=random.randint(1, 6)),
                    "created_at": datetime.utcnow() - timedelta(hours=48),
                })

            await db.execute(sa.insert(PropertyScore), property_scores)
            await db.execute(sa.insert(BuildingPermit), permits)
            await db.execute(sa.insert(PropertyReport), reports)
            await db.execute(sa.insert(SocialProofData), socials)
            await db.execute(sa.insert(ScheduledSMS), sms_records)

            showcase = {
                "contractor_id": contractor_id,
                "slug": "demo-showcase",
                "share_url": f"{settings.frontend_url or 'http://localhost:3000'}/showcase/demo",
                "theme": PALETTE,
                "created_at": datetime.utcnow(),
            }
            await db.execute(sa.insert(ContractorShowcase), showcase)

            campaign = {
                "id": make_uuid(),
                "contractor_id": contractor_id,
                "name": "Top Quartile Mailers",
                "template_key": "impact",
                "status": "sent",
                "created_at": datetime.utcnow() - timedelta(days=3),
                "scheduled_for": datetime.utcnow() - timedelta(days=2),
            }
            await db.execute(sa.insert(MailCampaign), campaign)

            mail_jobs = [
                {
                    "campaign_id": campaign["id"],
                    "property_id": properties[idx]["id"],
                    "recipient_name": properties[idx]["owner_name"],
                    "address": properties[idx]["address"],
                    "city": properties[idx]["city"],
                    "state": properties[idx]["state"],
                    "postal_code": properties[idx]["zip_code"],
                    "status": "delivered",
                    "provider_job_id": f"PJ-{random.randint(1000, 9999)}",
                    "cost_usd": 1.29,
                    "submitted_at": datetime.utcnow() - timedelta(days=2),
                    "created_at": datetime.utcnow() - timedelta(days=3),
                }
                for idx in range(5)
            ]
            await db.execute(sa.insert(MailJob), mail_jobs)

            await db.commit()
        finally:
            await db.close()

    import asyncio
    asyncio.run(_run())


if __name__ == "__main__":
    create_demo_data()
    print("Demo data seeded successfully.")
