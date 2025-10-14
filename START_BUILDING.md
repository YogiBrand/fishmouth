# 🚀 START BUILDING - Phase 1 Implementation Guide

## What to Build (In Order)

This guide tells developers **exactly what to build first** for the Fish Mouth MVP (Phase 1).

---

## ✅ Phase 1 Features (Build These)

### 1. Backend API + Database (Weeks 1-2)
**Priority**: HIGHEST

**What to Build**:
- [ ] FastAPI backend setup
- [ ] PostgreSQL database with all tables
- [ ] SQLAlchemy models (see `backend/models.py`)
- [ ] JWT authentication
- [ ] User registration & login
- [ ] Stripe integration (subscriptions + usage-based billing)
- [ ] API endpoints for all core features

**Files to Implement**:
- `backend/main.py` - Main FastAPI app
- `backend/models.py` - Database models
- `backend/database.py` - Database connection
- `backend/auth.py` - Authentication
- `backend/stripe_service.py` - Billing

**Documentation**: 
- `FISHMOUTH_MASTER_SPEC.md` - Architecture section
- `backend/` directory - All implementation files

---

### 2. Lead Detection System (Weeks 3-4)
**Priority**: HIGHEST

**What to Build**:
- [ ] Google Maps API integration (property discovery)
- [ ] Mapbox/Google Earth imagery fetching
- [ ] Claude Vision API integration (roof analysis)
- [ ] OpenCV integration (technical metrics)
- [ ] Multi-factor scoring algorithm
- [ ] Quality threshold filtering (60+ score)
- [ ] Background job processing (Celery)

**Files to Implement**:
- `backend/property_service.py` - Property discovery
- `backend/imagery_service.py` - Aerial imagery
- `backend/roof_detector.py` - AI roof analysis
- `backend/scoring_algorithm.py` - Lead scoring

**Documentation**:
- `.speckit/features/lead-detection.md` - Complete specification

**Success Criteria**:
- Can scan a city and find properties
- Can analyze roof condition with AI
- Can score leads accurately (0-100)
- Only charges for 60+ score leads

---

### 3. Client Acquisition AI Agent (Weeks 5-6)
**Priority**: HIGH

**What to Build**:
- [ ] Google Maps scraping for roofing companies
- [ ] Apollo.io API integration (contact enrichment)
- [ ] Claude Sonnet 4 for company scoring
- [ ] Email sequence generation (AI-powered)
- [ ] AI voice calling system (Telnyx + ElevenLabs + Deepgram)
- [ ] Meeting booking automation
- [ ] CRM for tracking prospects
- [ ] Performance optimization loop

**Files to Implement**:
- `backend/client_acquisition_agent.py` - Main agent logic
- `backend/company_scraper.py` - Company discovery
- `backend/contact_enrichment.py` - Apollo.io integration
- `backend/b2b_voice_agent.py` - Voice calling for B2B
- `backend/models.py` - Add ProspectCompany, DecisionMaker, OutreachInteraction models

**Documentation**:
- `.speckit/features/client-acquisition-ai-agent.md` - Complete specification

**Success Criteria**:
- Can find 100+ roofing companies per city
- Can enrich with decision maker contact info
- Can score companies 1-10 with AI
- Can generate personalized email sequences
- Can make autonomous sales calls
- Can book demo meetings
- Target: Sign 5 clients per month

---

### 4. Lead Outreach AI Agent (Weeks 7-8)
**Priority**: HIGH

**What to Build**:
- [ ] AI voice agent for calling homeowners
- [ ] Claude Sonnet 4 for script generation & conversation
- [ ] ElevenLabs for voice synthesis
- [ ] Deepgram for speech-to-text
- [ ] Telnyx for call infrastructure
- [ ] Call state machine (greeting, discovery, objections, closing)
- [ ] Objection handling logic
- [ ] Appointment booking
- [ ] Post-call analysis & follow-up

**Files to Implement**:
- `ai-voice-server/voice_server.py` - Main voice agent (already created)
- `backend/lead_outreach_service.py` - Orchestration
- `backend/appointment_booking.py` - Calendar integration

**Documentation**:
- `.speckit/features/voice-agent.md` - Complete specification

**Success Criteria**:
- Can call homeowners autonomously
- Can handle common objections
- Can book appointments
- Target: 35% close rate on leads

---

### 5. Frontend Dashboard + UI (Weeks 9-10)
**Priority**: MEDIUM

**What to Build**:
- [ ] React app setup with routing
- [ ] Authentication pages (login, signup)
- [ ] Dashboard with key metrics
- [ ] Scan management (start scan, view results)
- [ ] Lead detail view (full analysis, aerial image, actions)
- [ ] Analytics page (charts, conversion funnel, ROI)
- [ ] Settings page (business info, integrations)
- [ ] Onboarding wizard (5 steps)
- [ ] Sequence builder UI (Paragon-style)

**Files to Implement**:
- `frontend/src/App.jsx` - Main app
- `frontend/src/pages/Dashboard.jsx`
- `frontend/src/pages/LeadDetail.jsx`
- `frontend/src/pages/Analytics.jsx`
- `frontend/src/pages/Settings.jsx`
- `frontend/src/components/Onboarding/` - Wizard components

**Documentation**:
- `.speckit/features/onboarding.md` - Onboarding specification
- Existing frontend files in `frontend/src/`

**Success Criteria**:
- Beautiful, modern UI (Tailwind CSS)
- Intuitive navigation
- Real-time updates
- Mobile responsive

---

### 6. Analytics & Reporting (Week 11)
**Priority**: MEDIUM

**What to Build**:
- [ ] Real-time analytics dashboard
- [ ] Conversion funnel tracking
- [ ] ROI calculator
- [ ] Performance charts (Chart.js or Recharts)
- [ ] Geographic heat map
- [ ] Automated email reports (daily/weekly/monthly)
- [ ] Export functionality (CSV, PDF)

**Files to Implement**:
- `backend/analytics_service.py` - Analytics calculations
- `backend/reporting_service.py` - Report generation
- `frontend/src/pages/Analytics.jsx` - Analytics UI

**Documentation**:
- `.speckit/features/analytics-api.md` - Complete specification

**Success Criteria**:
- Roofing companies can see exact ROI
- Real-time data updates
- Automated reports sent on schedule

---

### 7. API for Integrations (Week 11)
**Priority**: MEDIUM

**What to Build**:
- [ ] RESTful API endpoints (GET leads, update status, etc.)
- [ ] API key management
- [ ] Rate limiting
- [ ] Webhook support
- [ ] API documentation (Swagger/OpenAPI)

**Files to Implement**:
- `backend/api_service.py` - API key management
- `backend/webhook_service.py` - Webhook delivery
- `backend/main.py` - Add API endpoints

**Documentation**:
- `.speckit/features/analytics-api.md` - API section

**Success Criteria**:
- Roofing companies can integrate with CRM
- Webhooks deliver reliably
- API is well documented

---

### 8. Testing & Deployment (Week 12)
**Priority**: HIGH

**What to Do**:
- [ ] Write unit tests for critical functions
- [ ] Write integration tests for API
- [ ] End-to-end testing
- [ ] Performance testing (can handle 1000+ leads)
- [ ] Security audit
- [ ] Deploy to production (AWS/DigitalOcean)
- [ ] Set up monitoring (Sentry, Datadog)
- [ ] Set up backups
- [ ] SSL/TLS configuration
- [ ] Domain setup (fishmouth.io)

**Files to Create**:
- `tests/` - Test suite
- `docker-compose.yml` - Production config
- `nginx.conf` - Web server config
- `DEPLOYMENT_GUIDE.md` - Deployment instructions

**Success Criteria**:
- All tests passing
- Production environment stable
- Monitoring in place
- Ready for first customers

---

## 🚫 What NOT to Build (Phase 2)

These features are coming later - **do NOT build them in Phase 1**:

- ❌ AI ad generation (Claude for copy, DALL-E for images)
- ❌ Video ad creation
- ❌ Facebook Ads API integration
- ❌ Google Ads API integration
- ❌ Campaign management
- ❌ Direct mail integration (Lob.com)
- ❌ Postcard/letter generation
- ❌ Advanced n8n workflows

**Why?**: These are important but not critical for MVP. We need to prove the core value (lead generation + AI agents) first.

---

## 📚 Documentation Reference

### For Each Feature, Read These Docs:

**Lead Detection**:
- `.speckit/features/lead-detection.md` - Full specification
- `backend/roof_detector.py` - Implementation reference

**Client Acquisition Agent**:
- `.speckit/features/client-acquisition-ai-agent.md` - Full specification
- Includes all data points, AI prompts, call scripts, CRM schema

**Lead Outreach Agent**:
- `.speckit/features/voice-agent.md` - Full specification
- Includes voice stack, call flows, objection handling

**Sequence Builder**:
- `.speckit/features/sequence-builder.md` - Full specification
- Includes node types, UI design, AI integration

**Onboarding**:
- `.speckit/features/onboarding.md` - Full specification
- Includes 5 steps, wizard flow, integration guides

**Analytics & API**:
- `.speckit/features/analytics-api.md` - Full specification
- Includes all metrics, API endpoints, webhook events

**Overall Architecture**:
- `FISHMOUTH_MASTER_SPEC.md` - Complete system overview
- `PRODUCT_ROADMAP.md` - Phased approach explanation

---

## 🎯 Success Criteria for Phase 1 Launch

### Technical:
- ✅ All backend APIs functional
- ✅ All frontend pages complete
- ✅ AI agents operational (both B2B and B2C)
- ✅ Lead scoring accurate (validated with test data)
- ✅ Billing working (Stripe subscriptions + usage-based)
- ✅ No critical bugs
- ✅ 99%+ uptime

### Business:
- ✅ 5 roofing company clients signed up
- ✅ Generating 150+ leads per client per month
- ✅ 35% appointment booking rate
- ✅ 25% of appointments close
- ✅ Client satisfaction score 8+/10
- ✅ AI agents running autonomously 24/7

### Metrics to Track:
- Client acquisition: 5/month
- Leads generated per client: 150/month
- Lead quality score: 72+ average
- Call answer rate: 35%+
- Appointment booking rate: 20%+
- Appointment show rate: 80%+
- Close rate: 25%+
- MRR: $1,500+ by month 1, $15,000+ by month 6
- Churn rate: <5%

---

## 🛠️ Development Setup

### 1. Clone and Setup:
```bash
cd /home/yogi/fishmouth

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install

# Start services
docker-compose up -d  # PostgreSQL, Redis
```

### 2. Environment Variables:
```bash
cp .env.example .env
# Fill in all API keys (see .env.example for list)
```

### 3. Database:
```bash
# Run migrations
python backend/migrate.py
```

### 4. Start Development:
```bash
# Terminal 1 - Backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 2 - Frontend
cd frontend
npm start

# Terminal 3 - Celery worker
cd backend
celery -A celery_app worker --loglevel=info

# Terminal 4 - AI Voice Server
cd ai-voice-server
uvicorn voice_server:app --reload --port 8001
```

---

## 💬 Questions?

**Read First**:
1. `.speckit/MASTER_INDEX.md` - Feature index
2. `FISHMOUTH_MASTER_SPEC.md` - System overview
3. `PRODUCT_ROADMAP.md` - Phased approach
4. Specific feature docs in `.speckit/features/`

**AI Assistant Context**:
- Cursor: Reference `.cursor/context.md`
- Claude Code: Reference `.claude/project-context.md`

---

**Project**: Fish Mouth (fishmouth.io)  
**Phase**: 1 (MVP)  
**Timeline**: 12 weeks  
**Status**: Ready to build  
**Date**: January 10, 2025

🚀 **Let's build something amazing!**
