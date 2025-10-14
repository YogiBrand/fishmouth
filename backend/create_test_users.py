#!/usr/bin/env python3
"""
Create test users for Fish Mouth AI
Run this script to initialize the database with test accounts
"""
from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import User
from auth import get_password_hash

def create_test_users():
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if users already exist
        existing_user = db.query(User).filter(User.email == "user@test.com").first()
        existing_admin = db.query(User).filter(User.email == "admin@fishmouth.io").first()
        
        if not existing_user:
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
            print("✅ Created regular user account")
        else:
            print("ℹ️  Regular user already exists")
        
        if not existing_admin:
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
            print("✅ Created admin account")
        else:
            print("ℹ️  Admin user already exists")
        
        # Create superadmin if needed
        existing_superadmin = db.query(User).filter(User.email == "superadmin@fishmouth.io").first()
        if not existing_superadmin:
            superadmin = User(
                email="superadmin@fishmouth.io",
                hashed_password=get_password_hash("super123"),
                company_name="Fish Mouth AI - Super",
                phone="+1-555-0000",
                role="superadmin",
                is_active=True
            )
            db.add(superadmin)
            print("✅ Created superadmin account")
        else:
            print("ℹ️  Superadmin user already exists")
        
        db.commit()
        
        print("\n" + "="*60)
        print("🎉 TEST ACCOUNTS CREATED SUCCESSFULLY!")
        print("="*60)
        print("\n📋 LOGIN CREDENTIALS:\n")
        print("👤 REGULAR USER:")
        print("   Email:    user@test.com")
        print("   Password: password123")
        print("   Role:     user")
        print()
        print("👨‍💼 ADMIN:")
        print("   Email:    admin@fishmouth.io")
        print("   Password: admin123")
        print("   Role:     admin")
        print()
        print("🔐 SUPERADMIN:")
        print("   Email:    superadmin@fishmouth.io")
        print("   Password: super123")
        print("   Role:     superadmin")
        print()
        print("="*60)
        print("🌐 Access the app at: http://localhost:3000")
        print("🔗 API docs at: http://localhost:8000/docs")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error creating test users: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_users()








