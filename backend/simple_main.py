"""
Minimal Fish Mouth backend for authentication and basic functionality
"""
import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
import sqlite3
import hashlib

# Configuration
SECRET_KEY = "your-secret-key-here-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Simple password hashing (for demo purposes)
import hashlib

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Initialize FastAPI
app = FastAPI(title="Fish Mouth API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database initialization
def init_db():
    # Just verify database exists - don't create tables, use existing schema
    conn = sqlite3.connect('fishmouth.db')
    conn.close()
    print("✅ Connected to existing Fish Mouth database")

# Models
class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class TokenData(BaseModel):
    email: Optional[str] = None

class User(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None
    role: str = 'user'
    plan: str = 'pro'
    created_at: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    company_name: Optional[str] = None
    phone: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

# Utility functions
def get_user_by_email(email: str):
    conn = sqlite3.connect('fishmouth.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def authenticate_user(email: str, password: str):
    user = get_user_by_email(email)
    if not user:
        return False
    if not verify_password(password, user['hashed_password']):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = get_user_by_email(email=token_data.email)
    if user is None:
        raise credentials_exception
    return user

# Routes
@app.get("/")
async def root():
    return {"message": "Fish Mouth API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.post("/auth/login", response_model=Token)
async def login_for_access_token(login_data: LoginRequest):
    user = authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['email']}, expires_delta=access_token_expires
    )
    
    # Format user data for response
    user_data = {
        "id": user['id'],
        "email": user['email'],
        "name": user.get('full_name', user['email'].split('@')[0]),
        "company_name": user.get('company_name', 'Demo Company'),
        "phone": user.get('phone', '(555) 123-4567'),
        "role": user.get('role', 'user'),
        "plan": user.get('subscription_tier', 'pro'),
        "created_at": user.get('created_at', datetime.utcnow().isoformat())
    }
    
    print(f"DEBUG: Returning login response with user_data: {user_data}")
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_data
    }

@app.post("/auth/signup")
async def signup(user_data: UserCreate):
    # Check if user exists
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new user
    conn = sqlite3.connect('fishmouth.db')
    cursor = conn.cursor()
    hashed_password = hash_password(user_data.password)
    
    cursor.execute('''
        INSERT INTO users (email, hashed_password, full_name, company_name, phone, role, subscription_tier)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (
        user_data.email,
        hashed_password,
        user_data.name or user_data.email.split('@')[0],
        user_data.company_name or 'New Company',
        user_data.phone or '',
        'user',
        'trial'
    ))
    
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_data.email}, expires_delta=access_token_expires
    )
    
    user_response = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name or user_data.email.split('@')[0],
        "company_name": user_data.company_name or 'New Company',
        "phone": user_data.phone or '',
        "role": 'user',
        "plan": 'trial',
        "created_at": datetime.utcnow().isoformat()
    }
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }

@app.get("/auth/me")
async def read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    return {
        "total_leads": 1247,
        "ultra_hot_leads": 89,
        "appointments_booked": 156,
        "active_clusters": 23,
        "new_clusters": 7,
        "conversion_rate": 12.8,
        "leads_over_time": [
            {"date": "2024-01-01", "leads": 45},
            {"date": "2024-01-02", "leads": 52},
            {"date": "2024-01-03", "leads": 48},
            {"date": "2024-01-04", "leads": 61},
            {"date": "2024-01-05", "leads": 55},
            {"date": "2024-01-06", "leads": 67},
            {"date": "2024-01-07", "leads": 72}
        ],
        "conversion_funnel": [
            {"stage": "Captured", "count": 1247},
            {"stage": "Qualified", "count": 892},
            {"stage": "Contacted", "count": 567},
            {"stage": "Appointments", "count": 156}
        ]
    }

@app.get("/api/v1/contagion/hot-leads")
async def get_hot_leads(current_user: dict = Depends(get_current_user)):
    return [
        {
            "id": 1,
            "name": "Sarah Johnson",
            "address": "123 Oak Street, Austin, TX 78704",
            "phone": "(555) 123-4567",
            "email": "sarah.johnson@email.com",
            "score": 95,
            "lead_source": "Storm Activity",
            "damage_estimate": "$15,000",
            "last_contact": "2024-01-05T10:30:00Z",
            "status": "hot"
        },
        {
            "id": 2,
            "name": "Mike Chen",
            "address": "456 Pine Avenue, Austin, TX 78705",
            "phone": "(555) 987-6543",
            "email": "mike.chen@email.com",
            "score": 88,
            "lead_source": "Neighbor Activity", 
            "damage_estimate": "$22,000",
            "last_contact": "2024-01-04T14:15:00Z",
            "status": "hot"
        },
        {
            "id": 3,
            "name": "Jennifer Williams",
            "address": "789 Maple Drive, Austin, TX 78706",
            "phone": "(555) 555-0123",
            "email": "jennifer.williams@email.com",
            "score": 92,
            "lead_source": "Insurance Activity",
            "damage_estimate": "$18,500",
            "last_contact": "2024-01-06T09:20:00Z",
            "status": "ultra_hot"
        }
    ]

@app.get("/api/v1/dashboard/active-clusters")
async def get_active_clusters(current_user: dict = Depends(get_current_user)):
    return [
        {
            "id": 1,
            "name": "West Austin Cluster",
            "address": "Oak Hill area",
            "lead_count": 15,
            "avg_score": 87.5,
            "storm_date": "2024-01-03",
            "status": "active"
        },
        {
            "id": 2,
            "name": "East Austin Cluster", 
            "address": "Mueller area",
            "lead_count": 23,
            "avg_score": 82.1,
            "storm_date": "2024-01-02",
            "status": "hot"
        },
        {
            "id": 3,
            "name": "South Austin Cluster",
            "address": "Southpark Meadows area", 
            "lead_count": 8,
            "avg_score": 91.2,
            "storm_date": "2024-01-04",
            "status": "ultra_hot"
        }
    ]

@app.get("/api/v1/dashboard/activity")
async def get_dashboard_activity(current_user: dict = Depends(get_current_user)):
    return [
        {
            "id": 1,
            "type": "lead_captured",
            "message": "New lead captured: Sarah Johnson",
            "timestamp": "2024-01-07T10:30:00Z"
        },
        {
            "id": 2,
            "type": "appointment_booked",
            "message": "Appointment booked with Mike Chen",
            "timestamp": "2024-01-07T09:15:00Z"
        },
        {
            "id": 3,
            "type": "report_generated",
            "message": "Report generated for West Austin Cluster",
            "timestamp": "2024-01-07T08:45:00Z"
        },
        {
            "id": 4,
            "type": "lead_contacted",
            "message": "Lead contacted: Jennifer Williams",
            "timestamp": "2024-01-07T07:20:00Z"
        }
    ]

# Voice API endpoints
@app.get("/api/voice/calls")
async def get_voice_calls(limit: int = 100, current_user: dict = Depends(get_current_user)):
    """Get voice call history"""
    # Generate mock voice calls data
    calls = []
    for i in range(10):
        calls.append({
            "id": f"call_{i+1}",
            "lead_name": f"Lead {i+1}",
            "to_number": f"+1555{i:03d}{i+1:04d}",
            "status": ["completed", "in_progress", "failed", "no_answer"][i % 4],
            "outcome": ["scheduled", "follow_up", "not_interested", "completed"][i % 4],
            "duration_seconds": 120 + (i * 30),
            "total_cost": 0.15 + (i * 0.02),
            "ai_cost": 0.08 + (i * 0.01),
            "carrier": "telnyx",
            "created_at": (datetime.utcnow() - timedelta(days=i)).isoformat(),
            "ai_summary": f"Spoke with homeowner about roof inspection. {'Interested in scheduling' if i % 2 == 0 else 'Requested follow-up'}.",
            "interest_level": ["high", "medium", "low"][i % 3],
            "retry_attempts": 0 if i % 3 == 0 else 1,
            "next_steps": f"Follow up in {'2 days' if i % 2 == 0 else '1 week'}"
        })
    
    return calls

@app.get("/api/voice/analytics/daily")
async def get_voice_analytics(days: int = 21, current_user: dict = Depends(get_current_user)):
    """Get voice call analytics"""
    # Generate mock analytics data
    daily_breakdown = []
    for i in range(days):
        date = datetime.utcnow() - timedelta(days=i)
        daily_breakdown.append({
            "day": date.strftime("%Y-%m-%d"),
            "calls": 15 + (i % 10),
            "connects": 8 + (i % 6),
            "bookings": 2 + (i % 3)
        })
    
    return {
        "total_calls": 247,
        "total_bookings": 32,
        "avg_booking_rate": 12.8,
        "avg_duration_seconds": 145,
        "total_call_cost_usd": 42.50,
        "total_ai_cost_usd": 18.30,
        "avg_latency_ms": 850,
        "daily_breakdown": daily_breakdown
    }

@app.get("/api/voice/calls/{call_id}")
async def get_voice_call_details(call_id: str, current_user: dict = Depends(get_current_user)):
    """Get detailed voice call transcript"""
    return {
        "id": call_id,
        "transcript_json": {
            "turns": [
                {
                    "role": "assistant",
                    "text": "Hi, this is Sarah from Elite Roofing. I'm calling about your recent inquiry regarding your roof. Do you have a few minutes to chat?",
                    "audio_url": None
                },
                {
                    "role": "user", 
                    "text": "Oh yes, I was wondering about getting an inspection done.",
                    "audio_url": None
                },
                {
                    "role": "assistant",
                    "text": "Great! I'd be happy to help you with that. We offer free comprehensive roof inspections. When would be a convenient time for you?",
                    "audio_url": None
                }
            ]
        },
        "outcome": "scheduled",
        "interest_level": "high",
        "duration_seconds": 180,
        "total_cost": 0.25,
        "ai_summary": "Homeowner is interested in roof inspection. Scheduled for next Tuesday at 2 PM."
    }

# Reports API endpoints
@app.post("/api/v1/reports/generate")
async def generate_report(request: dict, current_user: dict = Depends(get_current_user)):
    """Generate a lead report"""
    lead_id = request.get("lead_id")
    if not lead_id:
        raise HTTPException(status_code=400, detail="lead_id is required")
    
    return {
        "success": True,
        "report_id": f"report_{lead_id}_{int(datetime.utcnow().timestamp())}",
        "message": "Report generation started",
        "estimated_completion": (datetime.utcnow() + timedelta(minutes=5)).isoformat()
    }

# Area scanning endpoints
@app.post("/api/scan/area")
async def scan_area(request: dict, current_user: dict = Depends(get_current_user)):
    """Start area scanning for leads"""
    area_name = request.get("area_name", "")
    scan_type = request.get("scan_type", "city")
    
    return {
        "success": True,
        "scan_id": f"scan_{int(datetime.utcnow().timestamp())}",
        "area_name": area_name,
        "scan_type": scan_type,
        "estimated_leads": 25 + (len(area_name) % 20),
        "status": "started",
        "message": f"Started scanning {area_name} for qualified leads"
    }

# Sequence API endpoints
@app.get("/api/v1/sequences")
async def get_sequences(current_user: dict = Depends(get_current_user)):
    """Get lead sequences"""
    return [
        {
            "id": 1,
            "name": "Storm Follow-up Sequence",
            "description": "Automated follow-up for storm damage leads",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z",
            "total_enrolled": 45,
            "total_completed": 12,
            "total_converted": 8,
            "conversion_rate": 17.8,
            "flow_data": {"nodes": [{"id": 1, "type": "email"}, {"id": 2, "type": "call"}]}
        },
        {
            "id": 2,
            "name": "New Lead Nurture",
            "description": "Welcome sequence for new leads",
            "is_active": True,
            "created_at": "2024-01-15T00:00:00Z",
            "total_enrolled": 123,
            "total_completed": 67,
            "total_converted": 23,
            "conversion_rate": 18.7,
            "flow_data": {"nodes": [{"id": 1, "type": "sms"}, {"id": 2, "type": "email"}, {"id": 3, "type": "call"}]}
        }
    ]

@app.get("/api/v1/sequence-templates")
async def get_sequence_templates(current_user: dict = Depends(get_current_user)):
    """Get sequence templates"""
    return [
        {
            "name": "storm_followup",
            "display_name": "Storm Damage Follow-up",
            "description": "Multi-touch sequence for storm damage leads",
            "category": "Storm Response",
            "node_count": 5,
            "estimated_duration_days": 7
        },
        {
            "name": "new_lead_nurture",
            "display_name": "New Lead Nurture",
            "description": "Welcome and qualification sequence",
            "category": "Lead Nurturing",
            "node_count": 4,
            "estimated_duration_days": 5
        }
    ]

# AI Voice Campaign endpoints
@app.post("/api/v1/ai-voice/campaign")
async def start_ai_voice_campaign(request: dict, current_user: dict = Depends(get_current_user)):
    """Start AI voice campaign"""
    lead_ids = request.get("lead_ids", [])
    
    return {
        "success": True,
        "campaign_id": f"campaign_{int(datetime.utcnow().timestamp())}",
        "lead_count": len(lead_ids),
        "estimated_duration": "2-4 hours",
        "message": f"AI voice campaign started for {len(lead_ids)} leads"
    }

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()
    print("✅ Fish Mouth Simple Backend Started!")
    print("📍 Authentication endpoints:")
    print("   POST /auth/login - Login with email/password")
    print("   POST /auth/signup - Create new account") 
    print("   GET /auth/me - Get current user info")
    print("📊 Available accounts:")
    print("   User: user@test.com / password123")
    print("   Demo: demo@test.com / test123")
    print("   Admin: admin@test.com / admin123")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)