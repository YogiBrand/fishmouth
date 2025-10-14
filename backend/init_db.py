#!/usr/bin/env python3
"""
Initialize database with proper schema
"""
from sqlalchemy import text
from database import engine, Base, SessionLocal
from models import (
    User, AreaScan, Lead, Sequence, SequenceNode, SequenceEnrollment,
    VoiceCall, VoiceCallTurn, VoiceBooking, VoiceMetricsDaily, VoiceConfiguration,
    LeadActivity, AIConfiguration
)
from auth import get_password_hash

def init_database():
    print("🔄 Initializing database...")
    
    # Drop all tables with CASCADE
    with engine.connect() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE"))
        conn.execute(text("CREATE SCHEMA public"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO fishmouth"))
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        conn.commit()
    print("✅ Dropped existing schema")
    
    # Recreate tables
    Base.metadata.create_all(bind=engine)
    print("✅ Created fresh tables with correct schema")
    
    # Create test users
    db = SessionLocal()
    
    try:
        # Create regular user
        user = User(
            email="user@test.com",
            hashed_password=get_password_hash("password123"),
            company_name="Demo Roofing Co",
            phone="+1-555-0100",
            role="user",
            is_active=True
        )
        db.add(user)
        
        # Create admin user
        admin = User(
            email="admin@fishmouth.io",
            hashed_password=get_password_hash("admin123"),
            company_name="Fish Mouth AI",
            phone="+1-555-0001",
            role="admin",
            is_active=True
        )
        db.add(admin)
        
        # Create superadmin
        superadmin = User(
            email="superadmin@fishmouth.io",
            hashed_password=get_password_hash("super123"),
            company_name="Fish Mouth AI - Super",
            phone="+1-555-0000",
            role="superadmin",
            is_active=True
        )
        db.add(superadmin)
        
        db.commit()
        
        print("\n" + "="*60)
        print("🎉 DATABASE INITIALIZED SUCCESSFULLY!")
        print("="*60)
        print("\n📋 LOGIN CREDENTIALS:\n")
        print("👤 REGULAR USER:")
        print("   Email:    user@test.com")
        print("   Password: password123")
        print("   Access:   User Dashboard")
        print()
        print("👨‍💼 ADMIN:")
        print("   Email:    admin@fishmouth.io")
        print("   Password: admin123")
        print("   Access:   Admin Dashboard")
        print()
        print("🔐 SUPERADMIN:")
        print("   Email:    superadmin@fishmouth.io")
        print("   Password: super123")
        print("   Access:   Full Admin Access")
        print()
        print("="*60)
        print("🌐 Frontend: http://localhost:3000")
        print("🔗 API: http://localhost:8000")
        print("📖 API Docs: http://localhost:8000/docs")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
