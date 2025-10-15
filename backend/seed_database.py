#!/usr/bin/env python3
"""
Comprehensive database seeding script for FishMouth AI
Populates the database with realistic mock data to simulate a fully functional system
"""

import random
import sys
import os
import uuid
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

# Add the backend directory to the path
sys.path.append('/home/yogi/fishmouth/backend')

from database import engine, get_db, Base
from models import (
    User,
    AreaScan,
    Lead,
    LeadPriority,
    LeadStatus,
    VoiceCall,
    VoiceCallTurn,
    VoiceBooking,
    VoiceConfiguration,
    VoiceMetricsDaily,
    LeadActivity,
    Sequence,
    SequenceEnrollment,
    SequenceNode,
    SequenceNodeType,
)
from auth import get_password_hash

# Realistic data pools
FIRST_NAMES = [
    "Sarah", "Michael", "Jennifer", "David", "Lisa", "Robert", "Amanda", "Christopher",
    "Nicole", "Kevin", "Jessica", "William", "Ashley", "Daniel", "Michelle", "James",
    "Rachel", "Mark", "Stephanie", "Brian", "Lauren", "Matthew", "Kimberly", "Joshua",
    "Emily", "Thomas", "Angela", "Andrew", "Melissa", "Steven", "Amy", "Charles"
]

LAST_NAMES = [
    "Johnson", "Smith", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson",
    "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker"
]

CITIES = [
    "Austin", "Round Rock", "Cedar Park", "Georgetown", "Pflugerville", "Leander",
    "Hutto", "Manor", "Lakeway", "Bee Cave", "Dripping Springs", "Kyle", "Buda",
    "Cedar Creek", "Elgin", "Taylor", "Granger", "Liberty Hill", "San Marcos"
]

STREETS = [
    "Oak Street", "Pine Avenue", "Maple Drive", "Cedar Lane", "Elm Court", "Birch Way",
    "Walnut Place", "Chestnut Street", "Willow Drive", "Aspen Lane", "Poplar Court",
    "Spruce Avenue", "Hickory Way", "Magnolia Street", "Dogwood Drive", "Pecan Lane",
    "Sycamore Court", "Cottonwood Way", "Juniper Street", "Cypress Drive"
]

ROOF_MATERIALS = [
    "Asphalt Shingles", "Clay Tile", "Metal", "Wood Shake", "Composite Shingles",
    "Slate", "Concrete Tile", "EPDM Rubber", "TPO", "Built-up Roofing"
]

ROOF_CONDITIONS = ["Excellent", "Good", "Fair", "Poor", "Critical"]

DAMAGE_INDICATORS = [
    "hail_damage", "missing_shingles", "granule_loss", "wind_damage", "aging_wear",
    "gutter_issues", "flashing_problems", "moss_growth", "cracked_tiles", "sagging_areas",
    "storm_damage", "tree_damage", "animal_damage", "ice_dam_damage"
]

AREAS_TO_SCAN = [
    "Central Austin", "East Austin", "South Austin", "North Austin", "West Austin",
    "Round Rock Downtown", "Cedar Park West", "Georgetown Historic", "Pflugerville North",
    "Leander Hills", "Hutto Central", "Manor Creek", "Kyle Crossing", "Buda Heights",
    "Lakeway Estates", "Bee Cave Hills", "Dripping Springs Ranch", "Elgin Fields"
]

def create_realistic_phone():
    """Generate realistic phone numbers"""
    area_codes = ["512", "737", "346", "281", "713", "214", "469", "972"]
    area = random.choice(area_codes)
    exchange = f"{random.randint(200, 999)}"
    number = f"{random.randint(1000, 9999)}"
    return f"({area}) {exchange}-{number}"

def create_realistic_email(first_name, last_name):
    """Generate realistic email addresses"""
    domains = ["gmail.com", "outlook.com", "yahoo.com", "icloud.com", "company.com", "email.com"]
    patterns = [
        f"{first_name.lower()}.{last_name.lower()}",
        f"{first_name.lower()}{last_name.lower()}",
        f"{first_name.lower()}.{last_name.lower()}{random.randint(1, 999)}",
        f"{first_name[0].lower()}{last_name.lower()}",
        f"{first_name.lower()}.{last_name[0].lower()}"
    ]
    return f"{random.choice(patterns)}@{random.choice(domains)}"

def create_realistic_address():
    """Generate realistic addresses"""
    number = random.randint(100, 9999)
    street = random.choice(STREETS)
    return f"{number} {street}"

def create_test_user(db: Session):
    """Create a test user for demo purposes"""
    test_user = User(
        email="user@test.com",
        hashed_password=get_password_hash("password123"),
        company_name="FishMouth Roofing Demo",
        phone="(512) 555-0123",
        role="user",
        is_active=True,
        created_at=datetime.utcnow() - timedelta(days=30)
    )
    db.add(test_user)
    db.commit()
    db.refresh(test_user)
    return test_user

def create_area_scans(db: Session, user: User, num_scans=15):
    """Create realistic area scans"""
    scans = []
    
    for i in range(num_scans):
        # Mix of completed and in-progress scans
        status = "completed" if i < 12 else random.choice(["in_progress", "pending"])
        
        created_time = datetime.utcnow() - timedelta(days=random.randint(1, 60))
        completed_time = created_time + timedelta(hours=random.randint(1, 4)) if status == "completed" else None
        
        qualified_leads = random.randint(8, 35) if status == "completed" else random.randint(0, 15)
        total_properties = qualified_leads + random.randint(50, 200)
        
        scan = AreaScan(
            user_id=user.id,
            area_name=random.choice(AREAS_TO_SCAN),
            scan_type="city",
            status=status,
            total_properties=total_properties,
            processed_properties=qualified_leads + random.randint(0, 50),
            qualified_leads=qualified_leads,
            progress_percentage=100 if status == "completed" else random.randint(30, 90),
            scan_parameters={
                "latitude": round(30.0 + random.uniform(-0.3, 0.3), 6),
                "longitude": round(-97.7 + random.uniform(-0.3, 0.3), 6),
                "radius_miles": round(random.uniform(0.8, 2.5), 2),
                "estimated_cost": round(random.uniform(65.0, 275.0), 2),
                "property_cap": random.randint(200, 750),
            },
            created_at=created_time,
            completed_at=completed_time,
            results_summary={
                "qualified_leads": qualified_leads,
                "average_lead_score": random.randint(75, 95),
                "average_roof_age": random.randint(12, 25),
                "score_threshold": 70,
                "damage_distribution": {
                    random.choice(DAMAGE_INDICATORS): random.randint(3, 12),
                    random.choice(DAMAGE_INDICATORS): random.randint(5, 18),
                    random.choice(DAMAGE_INDICATORS): random.randint(2, 8),
                    random.choice(DAMAGE_INDICATORS): random.randint(4, 15)
                }
            }
        )
        db.add(scan)
        scans.append(scan)
    
    db.commit()
    return scans

def create_leads(db: Session, user: User, scans: list, num_leads=150):
    """Create realistic leads associated with area scans"""
    leads = []
    
    for i in range(num_leads):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        
        # Assign leads to completed scans
        completed_scans = [s for s in scans if s.status == "completed"]
        scan = random.choice(completed_scans) if completed_scans else scans[0]
        
        # Generate realistic lead scores with higher probability for good scores
        lead_score = max(40, min(100, int(random.gauss(82, 15))))
        
        # Determine priority based on lead score
        if lead_score >= 90:
            priority = LeadPriority.HOT
        elif lead_score >= 75:
            priority = LeadPriority.WARM
        else:
            priority = LeadPriority.COLD
        
        # Status based on priority and randomness
        status_weights = {
            LeadPriority.HOT: [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED, LeadStatus.CLOSED_WON],
            LeadPriority.WARM: [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED],
            LeadPriority.COLD: [LeadStatus.NEW, LeadStatus.CONTACTED]
        }
        status = random.choice(status_weights[priority])
        
        # Property details
        roof_age = random.randint(8, 30)
        roof_condition_score = max(20, min(100, int(random.gauss(65, 20))))
        roof_material = random.choice(ROOF_MATERIALS)
        roof_size = random.randint(1200, 4500)
        property_value = random.randint(250000, 800000)
        
        # Calculate estimated value (6-12% of property value)
        estimated_value = int(property_value * random.uniform(0.06, 0.12))
        
        # Damage indicators (1-4 random damages)
        num_damages = random.randint(1, 4)
        damage_list = random.sample(DAMAGE_INDICATORS, num_damages)
        # Imagery quality + dossiers
        image_quality_score = round(random.uniform(46, 96), 1)
        if image_quality_score < 52:
            quality_status = "failed"
        elif image_quality_score < 60:
            quality_status = "review"
        else:
            quality_status = "passed"

        possible_issues = ["cloud_cover", "soft_focus", "heavy_shadows", "poor_roof_visibility"]
        issue_count = 0 if quality_status == "passed" else random.randint(1, 2)
        image_quality_issues = random.sample(possible_issues, issue_count)

        anomaly_tags = random.sample(
            ["dark_streaks", "moss_growth", "granule_loss", "discoloration", "streetview_missing_shingles"],
            k=min(len(damage_list), random.randint(1, 3)),
        )

        normalized_url = f"https://images.fishmouth.ai/demo/normalized-{i}.jpg"
        heatmap_url = f"https://images.fishmouth.ai/demo/heatmap-{i}.png"

        street_view_angles = random.randint(1, 3)
        street_view_quality = {
            "angles_captured": street_view_angles,
            "average_quality": round(random.uniform(0.55, 0.92), 3),
            "average_occlusion": round(random.uniform(0.08, 0.45), 3),
            "headings": [round(random.uniform(0, 360), 1) for _ in range(street_view_angles)],
        }
        street_views = [
            {
                "heading": heading,
                "quality_score": round(random.uniform(0.55, 0.95), 3),
                "occlusion_score": round(random.uniform(0.05, 0.45), 3),
                "public_url": f"https://images.fishmouth.ai/demo/street-{i}-{idx}.jpg",
                "anomalies": [
                    {
                        "type": "streetview_dark_streaks",
                        "severity": round(random.uniform(0.3, 0.8), 2),
                        "probability": round(random.uniform(0.6, 0.95), 2),
                        "description": "Street view reveals discoloration on front slope.",
                    }
                ]
                if random.random() > 0.6
                else [],
            }
            for idx, heading in enumerate(street_view_quality["headings"])
        ]

        dossier = {
            "property_id": str(uuid.uuid4()),
            "imagery": {
                "public_url": f"https://images.fishmouth.ai/demo/satellite-{i}.jpg",
                "storage_path": f"dossier-demo-{i}/satellite/zoom19-mapbox.jpg",
                "source": random.choice(["mapbox", "google_static"]),
                "captured_at": datetime.utcnow().isoformat(),
                "quality": {
                    "score": image_quality_score,
                    "issues": image_quality_issues,
                    "metrics": {
                        "contrast": round(random.uniform(0.05, 0.18), 3),
                        "brightness": round(random.uniform(0.45, 0.62), 3),
                        "sharpness": round(random.uniform(0.002, 0.008), 4),
                    },
                },
            },
            "roof_view": {
                "rotation_degrees": round(random.uniform(-8, 8), 2),
                "coverage_ratio": round(random.uniform(0.62, 0.88), 3),
                "width": 768,
                "height": 768,
                "image_url": normalized_url,
                "mask_url": f"https://images.fishmouth.ai/demo/mask-{i}.png",
            },
            "analysis": {
                "summary": random.choice([
                    "Detected streaking on north slope with elevated granule loss.",
                    "Moss growth visible around dormers indicating moisture retention.",
                    "Patchwork repairs on south slope likely after hail event.",
                    "Overall wear consistent with 18+ year old asphalt shingles.",
                ]),
                "condition_score": roof_condition_score,
                "damage_indicators": anomaly_tags,
                "metrics": {
                    "dark_streak_ratio": round(random.uniform(0.12, 0.34), 3),
                    "moss_ratio": round(random.uniform(0.04, 0.18), 3),
                },
                "confidence": round(random.uniform(0.72, 0.93), 2),
                "replacement_urgency": random.choice(["immediate", "urgent", "plan_ahead"]),
            },
            "anomalies": [
                {
                    "type": tag,
                    "severity": round(random.uniform(0.4, 0.85), 2),
                    "probability": round(random.uniform(0.65, 0.96), 2),
                    "description": f"{tag.replace('_', ' ').title()} covering approximately {random.randint(120, 340)} sqft.",
                    "coverage_sqft": random.randint(120, 340),
                }
                for tag in anomaly_tags
            ],
            "heatmap": {
                "url": heatmap_url,
                "legend": {tag: random.choice(["#ff7f0e", "#1f77b4", "#2ca02c"]) for tag in anomaly_tags},
            },
            "street_view": street_views,
        }

        # AI analysis (augment with imagery metadata)
        ai_analysis = {
            "deal_probability": random.randint(65, 95),
            "urgency_score": random.randint(50, 90),
            "budget_fit": random.choice(["High", "Medium", "Low"]),
            "decision_timeline": random.choice(["1-2 weeks", "2-4 weeks", "1-2 months", "3+ months"]),
            "key_motivators": random.sample(
                [
                    "Storm damage",
                    "Insurance claim",
                    "Age of roof",
                    "Energy efficiency",
                    "Property value",
                    "Leak prevention",
                    "Aesthetic upgrade",
                ],
                random.randint(2, 4),
            ),
            "recommended_approach": random.choice(
                [
                    "Lead with insurance expertise and storm damage specialization",
                    "Emphasize energy savings and available rebates/incentives",
                    "Focus on preventive maintenance value and warranty extensions",
                    "Highlight premium materials and expedited service",
                ]
            ),
            "imagery": {
                "quality_status": quality_status,
                "quality": {"score": image_quality_score, "issues": image_quality_issues},
                "normalized_view_url": normalized_url,
                "heatmap_url": heatmap_url,
                "overlay_url": heatmap_url,
            },
            "street_view": street_views,
            "enhanced_roof_intelligence": dossier,
            "confidence": round(random.uniform(0.58, 0.88), 2),
            "score_version": "v1.5",
            "score_breakdown": {
                "condition": round(random.uniform(18, 32), 2),
                "age": round(random.uniform(14, 22), 2),
                "property_value": round(random.uniform(8, 15), 2),
                "damage_indicators": round(random.uniform(6, 14), 2),
                "imagery_quality": round(random.uniform(6, 12), 2),
                "contact_confidence": round(random.uniform(4, 9), 2),
            },
        }
        
        lead = Lead(
            user_id=user.id,
            area_scan_id=scan.id,
            address=create_realistic_address(),
            city=random.choice(CITIES),
            state="TX",
            zip_code=f"{random.randint(78700, 78799)}",
            roof_age_years=roof_age,
            roof_condition_score=roof_condition_score,
            roof_material=roof_material,
            roof_size_sqft=roof_size,
            aerial_image_url=f"https://example.com/aerial/{random.randint(1000, 9999)}.jpg",
            lead_score=lead_score,
            priority=priority,
            replacement_urgency=random.choice(["Low", "Medium", "High", "Critical"]),
            damage_indicators=damage_list,
            homeowner_name=f"{first_name} {last_name}",
            homeowner_phone=create_realistic_phone(),
            homeowner_email=create_realistic_email(first_name, last_name),
            property_value=property_value,
            estimated_value=estimated_value,
            conversion_probability=random.randint(60, 95),
            ai_analysis=ai_analysis,
            image_quality_score=image_quality_score,
            image_quality_issues=image_quality_issues,
            quality_validation_status=quality_status,
            analysis_confidence=ai_analysis["confidence"],
            score_version="v1.5",
            overlay_url=heatmap_url,
            roof_intelligence=dossier,
            street_view_quality=street_view_quality,
            status=status,
            created_at=scan.created_at + timedelta(hours=random.randint(1, 48)),
            last_contacted=datetime.utcnow() - timedelta(days=random.randint(0, 14)) if random.random() > 0.3 else None,
            notes=random.choice([
                "Hail damage visible, interested in full replacement",
                "Recent storm in area, insurance adjuster scheduled",
                "Interested in metal roofing options, price-conscious",
                "Professional contractor, values quality work",
                "Budget-conscious, interested in financing options",
                "New homeowner, wants to upgrade roof for energy efficiency",
                "Wood shake replacement needed, concerned about fire safety",
                "Metal roof maintenance and repair inquiry"
            ])
        )
        db.add(lead)
        leads.append(lead)
    
    db.commit()
    return leads

def create_voice_calls(db: Session, user: User, leads: list, num_calls=45):
    """Create realistic voice call records"""
    calls = []
    
    for i in range(num_calls):
        lead = random.choice(leads)
        
        # Call outcomes weighted by lead priority
        if lead.priority == LeadPriority.HOT:
            outcomes = ["interested", "appointment_scheduled", "callback_requested"]
            outcome = random.choice(outcomes)
        elif lead.priority == LeadPriority.WARM:
            outcomes = ["interested", "callback_requested", "not_interested", "voicemail"]
            outcome = random.choice(outcomes)
        else:
            outcomes = ["voicemail", "not_interested", "callback_requested"]
            outcome = random.choice(outcomes)
        
        duration = random.randint(120, 600)  # 2-10 minutes
        sentiment_score = random.randint(60, 95) if outcome in ["interested", "appointment_scheduled"] else random.randint(30, 70)
        
        call = VoiceCall(
            user_id=user.id,
            lead_id=lead.id,
            to_number=lead.homeowner_phone,
            status="completed",
            outcome=outcome,
            duration_seconds=duration,
            ai_summary={"sentiment_score": sentiment_score, "summary": f"Call with {lead.homeowner_name} - {outcome.replace('_', ' ')}"},
            initiated_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
            started_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)),
            ended_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)) + timedelta(seconds=duration)
        )
        db.add(call)
        calls.append(call)
    
    db.commit()
    return calls

def create_lead_activities(db: Session, user: User, leads: list, num_activities=200):
    """Create realistic lead activity records"""
    activities = []
    
    activity_types = [
        "scan_lead_created", "voice_call", "email_sent", "sms_sent", 
        "sequence_enrolled", "appointment_scheduled", "quote_sent",
        "follow_up_call", "contract_signed"
    ]
    
    for i in range(num_activities):
        lead = random.choice(leads)
        activity_type = random.choice(activity_types)
        
        # Generate appropriate descriptions
        descriptions = {
            "scan_lead_created": f"Lead discovered via area scan - Score: {lead.lead_score}",
            "voice_call": f"AI agent call with {lead.homeowner_name} - {random.choice(['interested', 'callback requested', 'left voicemail'])}",
            "email_sent": f"Sent {random.choice(['quote', 'company information', 'follow-up', 'appointment reminder'])} email",
            "sms_sent": f"SMS {random.choice(['reminder', 'follow-up', 'appointment confirmation'])} sent",
            "sequence_enrolled": f"Enrolled in {random.choice(['Premium Client', 'Storm Response', 'Budget-Conscious'])} sequence",
            "appointment_scheduled": f"Appointment scheduled for {(datetime.utcnow() + timedelta(days=random.randint(1, 14))).strftime('%m/%d/%Y')}",
            "quote_sent": f"Quote sent - ${random.randint(15000, 45000):,}",
            "follow_up_call": f"Follow-up call completed - {random.choice(['interested', 'needs more time', 'comparing options'])}",
            "contract_signed": f"Contract signed - ${random.randint(18000, 50000):,}"
        }
        
        activity = LeadActivity(
            user_id=user.id,
            lead_id=lead.id,
            activity_type=activity_type,
            title=f"{activity_type.replace('_', ' ').title()}",
            description=descriptions[activity_type],
            activity_metadata={
                "source": "ai_system",
                "confidence": random.randint(85, 98),
                "processed_at": datetime.utcnow().isoformat()
            },
            created_at=lead.created_at + timedelta(hours=random.randint(1, 720))  # Up to 30 days after lead creation
        )
        db.add(activity)
        activities.append(activity)
    
    db.commit()
    return activities

def create_voice_configuration(db: Session, user: User):
    """Create voice configuration for the user"""
    config = VoiceConfiguration(
        user_id=user.id,
        default_voice_id="rachel",
        tts_vendor="elevenlabs",
        voice_style="professional",
        speaking_rate=1.0,
        asr_vendor="deepgram",
        asr_language="en-US",
        llm_vendor="openai",
        llm_model="gpt-4o-mini",
        max_call_duration_minutes=15,
        enable_barge_in=True,
        require_consent=True,
        enable_recording=True
    )
    db.add(config)
    db.commit()
    return config


def create_demo_sequence(db: Session, user: User, leads: list) -> Sequence:
    """Seed a demo nurture sequence with a sample enrollment."""

    existing = (
        db.query(Sequence)
        .filter(Sequence.user_id == user.id, Sequence.name == "Demo Follow-Up Sequence")
        .first()
    )
    if existing:
        return existing

    flow_data = {
        "nodes": [
            {
                "id": "start",
                "type": "start",
                "position": {"x": 0, "y": 0},
                "data": {"label": "Sequence Start"},
            },
            {
                "id": "wait_short",
                "type": "wait",
                "position": {"x": 220, "y": 0},
                "data": {
                    "label": "Wait 60 seconds",
                    "delay_seconds": 60,
                },
            },
            {
                "id": "email_intro",
                "type": "email",
                "position": {"x": 440, "y": 0},
                "data": {
                    "label": "Send roof insights email",
                    "subject": "Your inspection preview",
                    "body": (
                        "Hi {{homeowner_name}},\n\n"
                        "Thanks for checking your roof insights. We spotted a few items worth reviewing. "
                        "Let us know a good time for a quick inspection."\n\n" "- FishMouth Roofing"
                    ),
                    "use_ai_writer": False,
                },
            },
            {
                "id": "wait_long",
                "type": "wait",
                "position": {"x": 660, "y": 0},
                "data": {
                    "label": "Wait 1 day",
                    "delay_days": 1,
                },
            },
            {
                "id": "sms_follow",
                "type": "sms",
                "position": {"x": 880, "y": 0},
                "data": {
                    "label": "Send follow-up SMS",
                    "message": "Quick reminder: we can confirm your roof inspection whenever you're ready.",
                    "use_ai_writer": False,
                },
            },
            {
                "id": "end",
                "type": "end",
                "position": {"x": 1100, "y": 0},
                "data": {"label": "Sequence Complete", "outcome": "completed"},
            },
        ],
        "edges": [
            {"id": "e1", "source": "start", "target": "wait_short"},
            {"id": "e2", "source": "wait_short", "target": "email_intro"},
            {"id": "e3", "source": "email_intro", "target": "wait_long"},
            {"id": "e4", "source": "wait_long", "target": "sms_follow"},
            {"id": "e5", "source": "sms_follow", "target": "end"},
        ],
    }

    sequence = Sequence(
        user_id=user.id,
        name="Demo Follow-Up Sequence",
        description="Wait 60s → email → wait 1 day → sms demo sequence",
        is_active=True,
        flow_data=flow_data,
    )
    db.add(sequence)
    db.commit()
    db.refresh(sequence)

    for node in flow_data["nodes"]:
        enum_type = SequenceNodeType(node["type"])
        db.add(
            SequenceNode(
                sequence_id=sequence.id,
                node_id=node["id"],
                node_type=enum_type,
                position_x=node.get("position", {}).get("x", 0),
                position_y=node.get("position", {}).get("y", 0),
                config=node.get("data", {}),
            )
        )

    db.commit()

    if leads:
        lead = leads[0]
        enrollment = SequenceEnrollment(
            sequence_id=sequence.id,
            lead_id=lead.id,
            user_id=user.id,
            status="active",
            current_node_id="start",
            next_execution_at=datetime.utcnow(),
            enrolled_at=datetime.utcnow(),
        )
        db.add(enrollment)
        sequence.total_enrolled += 1
        db.commit()

    return sequence

def main():
    """Main seeding function"""
    print("🌱 Starting comprehensive database seeding...")
    
    # Create tables if they don't exist
    Base.metadata.create_all(bind=engine)
    
    # Get database session
    db = next(get_db())
    
    try:
        # Clear existing data for clean slate
        print("🧹 Clearing existing data...")
        db.query(LeadActivity).delete()
        db.query(VoiceCall).delete()
        db.query(Lead).delete()
        db.query(AreaScan).delete()
        db.query(VoiceConfiguration).delete()
        db.query(User).filter(User.email == "user@test.com").delete()
        db.commit()
        
        # Create test user
        print("👤 Creating test user...")
        user = create_test_user(db)
        print(f"   ✅ Created user: {user.email}")
        
        # Create area scans
        print("🗺️  Creating area scans...")
        scans = create_area_scans(db, user, 15)
        print(f"   ✅ Created {len(scans)} area scans")
        
        # Create leads
        print("🎯 Creating leads...")
        leads = create_leads(db, user, scans, 150)
        print(f"   ✅ Created {len(leads)} leads")
        
        # Create voice calls
        print("📞 Creating voice call records...")
        calls = create_voice_calls(db, user, leads, 45)
        print(f"   ✅ Created {len(calls)} voice calls")
        
        # Create lead activities
        print("📋 Creating lead activities...")
        activities = create_lead_activities(db, user, leads, 200)
        print(f"   ✅ Created {len(activities)} activities")

        print("🔁 Creating demo follow-up sequence...")
        sequence = create_demo_sequence(db, user, leads)
        print(f"   ✅ Sequence ready: {sequence.name}")

        # Create voice configuration
        print("⚙️  Creating voice configuration...")
        config = create_voice_configuration(db, user)
        print(f"   ✅ Created voice configuration")

        print("\n🎉 Database seeding completed successfully!")
        print(f"📊 Summary:")
        print(f"   • User account: user@test.com / password123")
        print(f"   • Area scans: {len(scans)}")
        print(f"   • Leads: {len(leads)}")
        print(f"   • Voice calls: {len(calls)}")
        print(f"   • Activities: {len(activities)}")
        print(f"   • Demo sequences: 1")
        print(f"\n🚀 The application should now show comprehensive data!")
        
    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
