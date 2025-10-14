#!/usr/bin/env python3
"""
Production Data Seeding Script for Fish Mouth
Generates realistic data for testing the complete system functionality
"""

import psycopg2
from datetime import datetime, timedelta
import uuid
import json
import random

# Database connection
DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'database': 'fishmouth',
    'user': 'fishmouth',
    'password': 'fishmouth123'
}

# Sample data for realistic testing
CITIES_DATA = [
    {'city': 'Austin', 'state': 'TX', 'lat': 30.2672, 'lng': -97.7431},
    {'city': 'Dallas', 'state': 'TX', 'lat': 32.7767, 'lng': -96.7970},
    {'city': 'Houston', 'state': 'TX', 'lat': 29.7604, 'lng': -95.3698},
    {'city': 'Phoenix', 'state': 'AZ', 'lat': 33.4484, 'lng': -112.0740},
    {'city': 'Denver', 'state': 'CO', 'lat': 39.7392, 'lng': -104.9903}
]

STREET_NAMES = [
    'Main St', 'Oak Ave', 'Maple Dr', 'Cedar Ln', 'Pine St',
    'Elm Ave', 'First St', 'Second St', 'Park Ave', 'Hill Dr',
    'Valley Rd', 'Lake St', 'River Ave', 'Forest Dr', 'Garden St'
]

CONTRACTOR_NAMES = [
    'Supreme Roofing Solutions', 'Elite Roof Masters', 'Premium Roofing Co',
    'Professional Roof Services', 'Quality Roofing Systems', 'Reliable Roof Repair',
    'Advanced Roofing Technologies', 'Expert Roof Contractors', 'Superior Roofing Group',
    'Master Roofing Specialists'
]

PERMIT_TYPES = [
    'Roof Replacement', 'Roof Repair', 'New Construction', 'Re-roofing',
    'Storm Damage Repair', 'Roof Addition', 'Solar Installation', 'Gutter Replacement'
]

def generate_scraping_jobs(conn):
    """Generate sample scraping jobs"""
    cursor = conn.cursor()
    
    print("🔄 Creating scraping jobs...")
    
    for i, city_data in enumerate(CITIES_DATA):
        for job_type in ['permit', 'property', 'contractor']:
            job_id = str(uuid.uuid4())
            
            cursor.execute("""
                INSERT INTO scraping_jobs 
                (id, job_type, city, state, status, started_at, records_processed, 
                records_succeeded, records_failed, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                job_id,
                job_type,
                city_data['city'],
                city_data['state'],
                'completed',
                datetime.now() - timedelta(hours=random.randint(1, 48)),
                random.randint(50, 200),
                random.randint(45, 190),
                random.randint(0, 10),
                json.dumps({
                    'source_url': f'https://{city_data["city"].lower()}.gov/permits',
                    'scraping_method': 'selenium',
                    'cost_optimization': 'free_first'
                })
            ))
    
    conn.commit()
    print(f"✅ Created {len(CITIES_DATA) * 3} scraping jobs")

def generate_raw_properties(conn):
    """Generate sample property data"""
    cursor = conn.cursor()
    
    print("🏠 Creating property records...")
    
    # Get job IDs for property jobs
    cursor.execute("SELECT id FROM scraping_jobs WHERE job_type = 'property'")
    job_ids = [row[0] for row in cursor.fetchall()]
    
    property_count = 0
    for city_data in CITIES_DATA:
        job_id = random.choice(job_ids)
        
        # Generate 20-40 properties per city
        for i in range(random.randint(20, 40)):
            property_id = str(uuid.uuid4())
            street_num = random.randint(100, 9999)
            street_name = random.choice(STREET_NAMES)
            address = f"{street_num} {street_name}"
            
            # Generate realistic property data
            year_built = random.randint(1970, 2020)
            sqft = random.randint(1200, 4500)
            beds = random.randint(2, 5)
            baths = random.choice([1.0, 1.5, 2.0, 2.5, 3.0, 3.5])
            property_value = random.randint(150000, 850000)
            
            cursor.execute("""
                INSERT INTO raw_properties 
                (id, job_id, address, city, state, zip, owner_name, 
                property_value, year_built, sqft, beds, baths, property_type, 
                raw_data, processed)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                property_id,
                job_id,
                address,
                city_data['city'],
                city_data['state'],
                str(random.randint(10000, 99999)),
                f"{'John' if random.choice([True, False]) else 'Jane'} {random.choice(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones'])}",
                property_value,
                year_built,
                sqft,
                beds,
                baths,
                random.choice(['Single Family', 'Townhouse', 'Condo']),
                json.dumps({
                    'source': 'tax_assessor',
                    'confidence': random.uniform(0.8, 1.0),
                    'last_updated': datetime.now().isoformat()
                }),
                False
            ))
            property_count += 1
    
    conn.commit()
    print(f"✅ Created {property_count} property records")

def generate_raw_permits(conn):
    """Generate sample permit data"""
    cursor = conn.cursor()
    
    print("📋 Creating permit records...")
    
    # Get job IDs for permit jobs
    cursor.execute("SELECT id FROM scraping_jobs WHERE job_type = 'permit'")
    job_ids = [row[0] for row in cursor.fetchall()]
    
    permit_count = 0
    for city_data in CITIES_DATA:
        job_id = random.choice(job_ids)
        
        # Generate 30-60 permits per city
        for i in range(random.randint(30, 60)):
            permit_id = str(uuid.uuid4())
            street_num = random.randint(100, 9999)
            street_name = random.choice(STREET_NAMES)
            address = f"{street_num} {street_name}"
            
            issue_date = datetime.now() - timedelta(days=random.randint(1, 365))
            permit_type = random.choice(PERMIT_TYPES)
            contractor = random.choice(CONTRACTOR_NAMES)
            
            # Roof-related permits have higher estimated values
            if 'roof' in permit_type.lower() or 'Roof' in permit_type:
                estimated_value = random.randint(8000, 45000)
            else:
                estimated_value = random.randint(2000, 15000)
            
            cursor.execute("""
                INSERT INTO raw_permits 
                (id, job_id, permit_number, address, city, state, zip, issue_date, 
                permit_type, work_description, contractor_name, estimated_value, 
                source_url, raw_data, processed)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                permit_id,
                job_id,
                f"PERM-{random.randint(100000, 999999)}",
                address,
                city_data['city'],
                city_data['state'],
                str(random.randint(10000, 99999)),
                issue_date.date(),
                permit_type,
                f"{permit_type} - {random.choice(['Complete replacement', 'Partial repair', 'New installation', 'Storm damage restoration'])}",
                contractor,
                estimated_value,
                f"https://{city_data['city'].lower()}.gov/permits",
                json.dumps({
                    'urgency_score': random.uniform(0.3, 1.0),
                    'roof_age_estimate': random.randint(5, 30),
                    'storm_damage_likely': random.choice([True, False])
                }),
                False
            ))
            permit_count += 1
    
    conn.commit()
    print(f"✅ Created {permit_count} permit records")

def generate_lead_scores(conn):
    """Generate sample lead scores for properties"""
    cursor = conn.cursor()
    
    print("🎯 Creating lead scores...")
    
    # Get property IDs
    cursor.execute("SELECT id FROM raw_properties LIMIT 100")
    property_ids = [row[0] for row in cursor.fetchall()]
    
    for property_id in property_ids:
        # Generate realistic lead scores
        roof_age_score = random.randint(20, 95)
        property_value_score = random.randint(30, 90)
        storm_activity_score = random.randint(10, 85)
        neighborhood_score = random.randint(40, 95)
        
        overall_score = int((roof_age_score * 0.3 + property_value_score * 0.25 + 
                           storm_activity_score * 0.25 + neighborhood_score * 0.2))
        
        # Determine pricing tier based on score
        if overall_score >= 80:
            pricing_tier = 'premium'
            price_per_lead = random.uniform(125, 200)
        elif overall_score >= 60:
            pricing_tier = 'standard'
            price_per_lead = random.uniform(75, 125)
        else:
            pricing_tier = 'budget'
            price_per_lead = random.uniform(25, 75)
        
        buying_signals = []
        if roof_age_score > 70:
            buying_signals.append('aging_roof')
        if storm_activity_score > 60:
            buying_signals.append('recent_storm_activity')
        if property_value_score > 75:
            buying_signals.append('high_value_property')
        
        cursor.execute("""
            INSERT INTO lead_scores 
            (id, property_id, overall_score, roof_age_score, property_value_score, 
            storm_activity_score, neighborhood_score, buying_signals, pricing_tier, 
            price_per_lead)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            str(uuid.uuid4()),
            property_id,
            overall_score,
            roof_age_score,
            property_value_score,
            storm_activity_score,
            neighborhood_score,
            json.dumps(buying_signals),
            pricing_tier,
            price_per_lead
        ))
    
    conn.commit()
    print(f"✅ Created {len(property_ids)} lead scores")

def generate_property_images(conn):
    """Generate sample property image records"""
    cursor = conn.cursor()
    
    print("📸 Creating property image records...")
    
    # Get property IDs
    cursor.execute("SELECT id FROM raw_properties LIMIT 50")
    property_ids = [row[0] for row in cursor.fetchall()]
    
    image_count = 0
    for property_id in property_ids:
        # Generate 1-3 images per property
        for i in range(random.randint(1, 3)):
            image_type = random.choice(['satellite', 'street_view', 'processed'])
            view_angle = random.choice(['overhead', 'front', 'left', 'right'])
            
            cursor.execute("""
                INSERT INTO property_images 
                (id, property_id, image_type, view_angle, s3_key, s3_bucket, 
                capture_date, image_width, image_height, quality_score, 
                usable_for_analysis, processed)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                str(uuid.uuid4()),
                property_id,
                image_type,
                view_angle,
                f"images/{property_id}/{image_type}_{view_angle}.jpg",
                'fishmouth-property-images',
                datetime.now().date() - timedelta(days=random.randint(0, 30)),
                random.choice([640, 1280, 1920]),
                random.choice([480, 720, 1080]),
                random.randint(65, 95),
                random.choice([True, False]),
                image_type == 'processed'
            ))
            image_count += 1
    
    conn.commit()
    print(f"✅ Created {image_count} property image records")

def generate_system_health_records(conn):
    """Generate system health monitoring records"""
    cursor = conn.cursor()
    
    print("💊 Creating system health records...")
    
    services = [
        {'service': 'scraper-service', 'health_check': 'api'},
        {'service': 'enrichment-service', 'health_check': 'database'},
        {'service': 'image-processor', 'health_check': 'api'},
        {'service': 'lead-generator', 'health_check': 'scorer'},
        {'service': 'orchestrator', 'health_check': 'scheduler'},
        {'service': 'main-backend', 'health_check': 'api'}
    ]
    
    # Generate health records for the last 7 days
    for day in range(7):
        check_time = datetime.now() - timedelta(days=day)
        
        for service in services:
            # Most checks are healthy, with occasional issues
            status = random.choices(
                ['healthy', 'degraded', 'down'], 
                weights=[85, 12, 3]
            )[0]
            
            response_time = None
            error_count = 0
            last_error = None
            
            if status == 'healthy':
                response_time = random.randint(50, 250)
            elif status == 'degraded':
                response_time = random.randint(500, 2000)
                error_count = random.randint(1, 5)
                last_error = 'Slow response times detected'
            else:
                error_count = random.randint(5, 20)
                last_error = 'Service unavailable'
            
            cursor.execute("""
                INSERT INTO system_health 
                (id, service_name, health_check, status, response_time_ms, 
                error_count, last_error, checked_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                str(uuid.uuid4()),
                service['service'],
                service['health_check'],
                status,
                response_time,
                error_count,
                last_error,
                check_time
            ))
    
    conn.commit()
    print(f"✅ Created {len(services) * 7} system health records")

def main():
    """Main seeding function"""
    print("🚀 Starting Production Data Seeding for Fish Mouth")
    print("=" * 60)
    
    try:
        # Connect to database
        conn = psycopg2.connect(**DB_CONFIG)
        print("✅ Connected to PostgreSQL database")
        
        # Generate all sample data
        generate_scraping_jobs(conn)
        generate_raw_properties(conn)
        generate_raw_permits(conn)
        generate_lead_scores(conn)
        generate_property_images(conn)
        generate_system_health_records(conn)
        
        # Final summary
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM scraping_jobs")
        jobs_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM raw_properties")
        properties_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM raw_permits")
        permits_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM lead_scores")
        leads_count = cursor.fetchone()[0]
        
        print("\n" + "=" * 60)
        print("🎉 PRODUCTION DATA SEEDING COMPLETE!")
        print("=" * 60)
        print(f"📊 Database Summary:")
        print(f"   • Scraping Jobs: {jobs_count}")
        print(f"   • Properties: {properties_count}")
        print(f"   • Permits: {permits_count}")
        print(f"   • Lead Scores: {leads_count}")
        print(f"   • Total Records: {jobs_count + properties_count + permits_count + leads_count}")
        print("\n💰 Estimated Lead Value: ${:,.2f}".format(leads_count * 125))
        print("\n🚀 System is now ready for production use!")
        print("\n🌐 Access Points:")
        print("   • Frontend: http://localhost:3000")
        print("   • Backend API: http://localhost:8000")
        print("   • API Docs: http://localhost:8000/docs")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error during data seeding: {e}")
        raise

if __name__ == "__main__":
    main()
