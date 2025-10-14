# FISH MOUTH - COMPLETE SYSTEM SPECIFICATION & CONTEXT
**AI-Powered Roofing Lead Generation & Sales Automation Platform**

Version: 3.0  
Last Updated: 2025-10-13  
Status: Phase 2 - Core Features (70% Complete)  

---

## 🎯 EXECUTIVE SUMMARY

Fish Mouth is a comprehensive, self-hosted lead generation and sales automation platform specifically designed for roofing contractors. The platform uses AI-powered aerial imagery analysis to identify aged roofs, generate high-quality leads, create persuasive marketing materials, and automate complete sales sequences including AI voice calls.

### Core Value Proposition
- **Quality-Based Pricing**: $299/month + $1.13 per quality lead (60+ score only)
- **80% Profit Margin**: Pay 5x API costs to ensure sustainable revenue
- **30-Day Money-Back Guarantee**: Full refund on lead quality concerns
- **Self-Hosted Infrastructure**: Minimize external costs, maximize control

---

## 📋 TABLE OF CONTENTS

1. [System Architecture](#system-architecture)
2. [Business Model & Pricing](#business-model--pricing)
3. [Core Features](#core-features)
4. [Technology Stack](#technology-stack)
5. [AI Integration](#ai-integration)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Frontend Components](#frontend-components)
9. [Deployment Strategy](#deployment-strategy)
10. [Integration Requirements](#integration-requirements)
11. [Speckit Implementation](#speckit-implementation)

---

## 🏗️ SYSTEM ARCHITECTURE

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                         │
│  • Dashboard • Sequence Builder • Lead Management            │
│  • Onboarding • AI Settings • Campaign Manager              │
└─────────────────────┬───────────────────────────────────────┘
                      │ REST API / WebSocket
┌─────────────────────▼───────────────────────────────────────┐
│                   BACKEND (FastAPI)                          │
│  • Authentication • Lead Scoring • Payments                  │
│  • Sequence Engine • Campaign Manager                        │
└─────┬────────┬────────┬────────┬────────┬───────────────────┘
      │        │        │        │        │
┌─────▼──┐ ┌──▼───┐ ┌──▼───┐ ┌──▼────┐ ┌▼─────────────────┐
│Database│ │Redis │ │Celery│ │ n8n   │ │AI Voice Server   │
│Postgres│ │Cache │ │Worker│ │Auto   │ │(WebSocket)       │
└────────┘ └──────┘ └──────┘ └───────┘ └──────────────────┘
      │                           │              │
      └───────────────┬───────────┴──────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   EXTERNAL SERVICES                          │
│  • Claude (AI) • ElevenLabs (Voice) • Telnyx (Calls)        │
│  • Deepgram (STT) • Stripe (Payments) • Lob (Mail)          │
│  • Mapbox (Imagery) • Google Maps (Geocoding)               │
└─────────────────────────────────────────────────────────────┘
```

### Self-Hosted Components (Docker)

1. **PostgreSQL** - Primary database
2. **Redis** - Caching & job queues
3. **n8n** - Workflow automation (webhooks, integrations)
4. **Backend API** - FastAPI application
5. **Celery Workers** - Background job processing
6. **Frontend** - React SPA
7. **AI Voice Server** - Custom voice agent service

### External Services (Paid APIs)

1. **Anthropic Claude** - AI text generation, analysis ($0.015/1K tokens)
2. **ElevenLabs** - Voice synthesis ($0.30/1K chars)
3. **Telnyx** - Phone calls (≈$0.012/min outbound US)
4. **Deepgram** - Speech-to-text ($0.0043/min)
5. **Stripe** - Payment processing (2.9% + $0.30)
6. **Lob.com** - Direct mail ($0.60-$2.00/piece)
7. **Mapbox** - Aerial imagery ($0.005/request)
8. **Google Maps** - Geocoding ($0.005/request)

---

## 💰 BUSINESS MODEL & PRICING

### Pricing Structure

**Trial**: 5 free leads, 14 days, no credit card

**Professional**: $299/month + $1.13/quality lead
- Unlimited scans
- Only pay for leads with 60+ quality score
- Leads below 60 = FREE
- 5 AI ad generations/month
- All integrations included

**Enterprise**: $999/month + $0.90/quality lead
- Everything in Professional
- 20% volume discount on leads
- Unlimited AI ad generation
- White-label reporting
- Dedicated account manager
- API access

### Cost Analysis Per Lead

```
API Costs:
- Mapbox imagery: $0.005
- Claude Vision analysis: $0.015
- Google Maps geocoding: $0.005
- Property data enrichment: $0.10
- Contact enrichment: $0.10
────────────────────────────
Total API Cost: $0.225

Revenue Per Lead:
Professional: $1.13 - $0.225 = $0.905 profit (80% margin)
Enterprise: $0.90 - $0.225 = $0.675 profit (75% margin)
```

### Additional Revenue Streams

1. **Direct Mail**: $2.36 profit per postcard
2. **AI Voice Calls**: $0.50/call (charged to user)
3. **Contact Enrichment**: $5.00 per contact lookup
4. **Additional Lead Packs**: $40/lead (pay-per-lead users)

---

## 🚀 CORE FEATURES

### 1. AI-Powered Roof Detection

**Capabilities:**
- Aerial imagery analysis using Claude Sonnet 4 Vision
- Detect roof age with 95%+ accuracy
- Identify visible damage: missing shingles, granule loss, sagging, moss, etc.
- Calculate composite lead score (0-100)
- Prioritize leads: HOT (80+), WARM (60-79), COLD (<60)

**Technical Implementation:**
- Fetch imagery from Mapbox Static Images API
- Enhance with OpenCV for edge detection
- Send to Claude Vision with detailed prompt
- Calculate weighted score based on:
  - Roof age (40%)
  - Visible damage (30%)
  - Property value (15%)
  - Location factors (15%)

### 2. Intelligent Sequence Builder

**Paragon-Style Design:**
- Vertical node layout (not free-form)
- Perfect spacing and alignment
- Nodes: Email, SMS, Call, Wait, Condition, Research
- Right-side panel slides in on node click
- Visual flow with clear connections

**Node Types:**

1. **Email Node**
   - AI-generated subject line & body
   - Custom instructions per email
   - Personalization tokens
   - Track opens, clicks, replies

2. **SMS Node**
   - AI-generated 160-char messages
   - Emoji support (configurable)
   - Reply detection
   - Opt-out handling

3. **Call Node**
   - AI voice agent integration
   - Automatic dialing
   - Call recording & transcription
   - Objection handling
   - Appointment scheduling

4. **Wait Node**
   - Delay hours/days
   - Wait until specific time
   - Wait until specific day
   - Respect working hours

5. **Condition Node**
   - Branch based on email opened
   - Branch based on email clicked
   - Branch based on lead score
   - Branch based on reply

6. **Research Node**
   - AI-powered lead research
   - Local market insights
   - Weather history
   - Neighborhood analysis

### 3. AI Voice Agent System

**Professional Sales Agent:**
- Uses ElevenLabs for voice synthesis
- Claude Sonnet 4 for conversation intelligence
- Deepgram for speech recognition
- Telnyx for phone infrastructure

**Capabilities:**
- Natural conversation flow
- Objection handling (3 levels)
- Urgency creation
- Appointment scheduling
- CRM note generation
- Call summary & next steps

**Voice Agent Prompts:**
```
Opening: Establish credibility + mention aerial photos + create urgency
Objection: Empathy + reframe + redirect to value + reschedule
Closing: Offer specific times + create scarcity + confirm details
```

### 4. Marketing Automation

**AI Ad Generation:**
- Generate persuasive ad copy using Claude
- Create images using DALL-E 3
- Generate video scripts (for D-ID integration)
- Platform-specific optimization (Facebook, Google)

**Campaign Management:**
- Facebook Ads integration
- Google Ads integration (coming soon)
- Direct mail automation via Lob
- n8n workflow automation

**Targeting:**
- Postal code precision
- Age demographics (45-65+)
- Interest targeting (home improvement)
- Behavior targeting (homeowners)

### 5. Beautiful Onboarding Experience

**5-Step Wizard:**

1. **Welcome** - Value proposition, features, guarantee
2. **Business Info** - Company details, branding, service area
3. **Integrations** - Facebook, Google Ads, n8n (optional)
4. **First Scan** - Guide through scanning first city
5. **Complete** - Success celebration, next steps

**Help Option:**
- "Get Personalized Onboarding by Fish Mouth" button
- Request form submission
- Team notification via n8n webhook
- 24-hour response guarantee

### 6. Lead Management

**Lead Detail View:**
- Aerial imagery with AI annotations
- Comprehensive roof analysis report
- Contact enrichment ($5/contact)
- Click-to-call functionality
- Click-to-email with templates
- Direct mail options
- Sequence enrollment
- Activity timeline

**Bulk Actions:**
- Enroll in sequence (multiple leads)
- Export to CSV
- Send bulk direct mail
- Tag and organize

---

## 🛠️ TECHNOLOGY STACK

### Backend

**Core:**
- Python 3.11
- FastAPI 0.104+
- SQLAlchemy 2.0 (ORM)
- PostgreSQL 15
- Redis 7
- Celery 5.3 (background jobs)

**AI & ML:**
- Anthropic Claude Sonnet 4
- OpenAI GPT-4 (fallback)
- ElevenLabs (voice)
- Deepgram (speech-to-text)
- OpenCV (image processing)

**Integrations:**
- Telnyx (calls & SMS)
- Stripe (payments)
- Lob (direct mail)
- Facebook Business API
- Google Ads API (coming)
- Mapbox API
- Google Maps API

### Frontend

**Core:**
- React 18
- React Router 6
- TailwindCSS 3
- React Flow (sequence builder)
- Lucide Icons

**State Management:**
- Context API
- React Query (server state)

**Key Libraries:**
- axios (HTTP client)
- @stripe/stripe-js (payments)
- react-flow-renderer (visual builder)
- date-fns (date handling)
- react-hot-toast (notifications)

### Infrastructure

**Containerization:**
- Docker
- Docker Compose
- Multi-service orchestration

**Reverse Proxy:**
- Nginx (production)
- Traefik (alternative)

**Monitoring:**
- Sentry (error tracking)
- LogRocket (session replay)
- Custom analytics

---

## 🤖 AI INTEGRATION

### Claude Sonnet 4 Usage

**1. Roof Analysis**
```python
Prompt Template:
- Analyze this aerial roof image
- Estimate age based on visual cues
- Identify specific damage types
- Rate condition 0-100
- Recommend urgency level
- Provide homeowner-friendly summary

Input: Base64 encoded image + property metadata
Output: Detailed JSON analysis
Cost: ~$0.015 per analysis
```

**2. Email Generation**
```python
Prompt Template:
- Lead context (name, address, roof condition)
- Company voice & values
- Custom instructions per step
- Desired tone & length
- Call-to-action style

Input: Lead data + AI config + custom instructions
Output: Subject line + HTML body
Cost: ~$0.010 per email
```

**3. SMS Generation**
```python
Prompt Template:
- 160-char limit
- Personalized with name
- Urgency creation
- Clear CTA

Input: Lead data + tone preferences
Output: SMS text
Cost: ~$0.005 per SMS
```

**4. Voice Call Scripts**
```python
Prompt Template:
- Opening hook (5-10 seconds)
- Proof points (aerial photos)
- Urgency creation
- Objection handling
- Appointment scheduling

Input: Lead data + call history
Output: Natural conversational script
Cost: ~$0.015 per generation
```

**5. Lead Research**
```python
Prompt Template:
- Analyze local market
- Weather history
- Common roof issues in area
- Best approach for this lead

Input: Property address + context
Output: Research insights JSON
Cost: ~$0.015 per research
```

### AI Customization Settings

**Voice Agent:**
- Tone: Professional / Friendly / Casual
- Speed: 0.5x - 2.0x
- Urgency Level: Low / Medium / High
- Max Call Duration: 120-600 seconds
- Max Objections: 2-5
- Voice ID: Select from 20+ ElevenLabs voices

**Chat Agent:**
- Tone: Professional / Friendly / Casual
- Response Length: Short / Medium / Long
- System Prompt: Custom instructions
- Greeting Prompt: First message template

**Email Generation:**
- Tone: Professional / Friendly / Urgent
- Length: Short / Medium / Long
- Personalization: Low / Medium / High
- CTA Style: Direct / Soft / Urgent
- Custom prompts per step

**SMS Generation:**
- Tone: Professional / Friendly / Casual
- Emoji Usage: On / Off
- Length: Always short (<160 chars)

**Company Voice:**
- Voice Description: "We are a family-owned..."
- Key Differentiators: ["Licensed", "A+ BBB", "30yr warranty"]
- Value Propositions: ["Free inspections", "Financing available"]
- Common Objections: ["Too expensive", "Not interested"]

**AI Behavior:**
- Creativity (0-1): Controls randomness
- Formality (0-1): Casual vs formal
- Urgency (0-1): Pressure level

---

## 💾 DATABASE SCHEMA

### Core Tables

**users**
```sql
- id: integer (PK)
- email: string (unique)
- hashed_password: string
- company_name: string
- full_name: string
- phone: string
- business_description: text
- business_logo_url: string
- website: string
- service_area: json (array of cities)
- brand_colors: json {primary, secondary}
- subscription_tier: enum (free_trial, professional, enterprise)
- subscription_status: string (trial, active, cancelled)
- subscription_price: float
- price_per_lead: float
- free_leads_remaining: integer
- guarantee_eligible: boolean
- guarantee_expires: datetime
- stripe_customer_id: string
- facebook_access_token: string (encrypted)
- facebook_ad_account_id: string
- google_ads_customer_id: string
- n8n_webhook_url: string
- credit_balance: float
- ad_credits: integer
- created_at: datetime
- last_login: datetime
```

**properties** (Leads)
```sql
- id: integer (PK)
- address: string
- city: string (indexed)
- state: string
- zip_code: string (indexed)
- latitude: float
- longitude: float
- year_built: integer
- roof_age_years: integer
- property_type: string
- square_footage: integer
- has_aerial_image: boolean
- aerial_image_url: string
- ai_analysis_complete: boolean
- ai_confidence_score: float
- roof_condition_score: float (0-100)
- lead_score: float (0-100)
- lead_priority: string (HOT, WARM, COLD)
- replacement_urgency: string
- ai_detailed_analysis: json
- roof_material_detected: string
- roof_color: string
- roof_pitch: string
- visible_issues: json (array)
- homeowner_name: string
- homeowner_phone: string
- homeowner_email: string
- homeowner_age: integer
- property_value: integer
- length_of_residence: integer
- contacted_at: datetime
- contact_method: string
- scan_id: string (indexed)
- created_at: datetime
```

**sequences**
```sql
- id: integer (PK)
- user_id: integer (FK)
- name: string
- description: text
- is_active: boolean
- flow_data: json {nodes, edges}
- ai_instructions: json (per-step instructions)
- tone: string (professional, friendly, urgent)
- personalization_level: string
- total_enrolled: integer
- total_completed: integer
- total_converted: integer
- conversion_rate: float
- working_hours_start: string
- working_hours_end: string
- working_days: json (array)
- timezone: string
- created_at: datetime
- updated_at: datetime
```

**sequence_enrollments**
```sql
- id: integer (PK)
- sequence_id: integer (FK)
- property_id: integer (FK)
- user_id: integer (FK)
- status: string (active, paused, completed, failed)
- current_step: integer
- current_node_id: string
- steps_completed: integer
- emails_sent: integer
- sms_sent: integer
- calls_made: integer
- emails_opened: integer
- emails_clicked: integer
- emails_replied: integer
- converted: boolean
- conversion_date: datetime
- appointment_scheduled: boolean
- next_step_at: datetime
- enrolled_at: datetime
- completed_at: datetime
```

**voice_calls**
```sql
- id: integer (PK)
- user_id: integer (FK)
- property_id: integer (FK)
- call_sid: string (Carrier SID / Telnyx Call Control ID)
- from_number: string
- to_number: string
- status: string (initiated, ringing, in-progress, completed)
- duration: integer (seconds)
- recording_url: string
- transcript: text
- ai_summary: json
- outcome: string (scheduled, follow_up, rejected, no_answer)
- interest_level: string (high, medium, low)
- objections_raised: json (array)
- probability_to_close: float (0-100)
- appointment_scheduled: boolean
- appointment_datetime: datetime
- call_cost: float
- ai_cost: float
- initiated_at: datetime
- completed_at: datetime
```

**ai_agent_configs**
```sql
- id: integer (PK)
- user_id: integer (FK, unique)
- voice_agent_enabled: boolean
- voice_tone: string
- voice_speed: float
- voice_id: string (ElevenLabs)
- voice_opening_prompt: text
- voice_objection_handling_prompt: text
- voice_closing_prompt: text
- voice_max_call_duration: integer
- voice_urgency_level: string
- chat_agent_enabled: boolean
- chat_tone: string
- chat_system_prompt: text
- email_tone: string
- email_length: string
- email_personalization: string
- email_generation_prompt: text
- sms_tone: string
- sms_emoji_usage: boolean
- sms_generation_prompt: text
- company_voice_description: text
- key_differentiators: json (array)
- value_propositions: json (array)
- common_objections: json (array)
- ai_creativity: float (0-1)
- ai_formality: float (0-1)
- ai_urgency: float (0-1)
- created_at: datetime
- updated_at: datetime
```

---

## 🔌 API ENDPOINTS

### Authentication
```
POST   /api/auth/signup          - Create account
POST   /api/auth/login           - Login
GET    /api/auth/me              - Get current user
```

### Onboarding
```
GET    /api/onboarding/status    - Get progress
PUT    /api/onboarding/update    - Update step
POST   /api/onboarding/complete  - Mark complete
POST   /api/onboarding/request-help - Request personalized setup
```

### User Settings
```
PUT    /api/settings/business    - Update business info
POST   /api/settings/logo        - Upload logo
POST   /api/integrations/facebook/connect - Connect Facebook
DELETE /api/integrations/facebook/disconnect - Disconnect
POST   /api/integrations/google-ads/connect - Connect Google Ads
GET    /api/integrations/status  - Get all integrations
```

### Scanning & Leads
```
POST   /api/scan/start           - Start new scan
GET    /api/scan/{scan_id}/status - Get scan progress
GET    /api/scan/{scan_id}/results - Get scan results
GET    /api/scans/recent         - Get recent scans
GET    /api/lead/{lead_id}       - Get lead details
POST   /api/lead/{lead_id}/enrich - Enrich contact data
GET    /api/dashboard/stats      - Get dashboard statistics
```

### Sequences
```
POST   /api/sequences/create     - Create sequence
GET    /api/sequences            - List all sequences
GET    /api/sequences/{id}       - Get sequence details
PUT    /api/sequences/{id}       - Update sequence
POST   /api/sequences/{id}/enroll - Enroll leads
GET    /api/sequences/templates  - Get pre-built templates
```

### AI Voice Calls
```
POST   /api/voice/make-call      - Initiate AI call
GET    /api/voice/calls          - Get call history
GET    /api/voice/call/{id}/summary - Get call analysis
WS     /api/voice/stream         - Real-time voice streaming
```

### Ad Generation
```
POST   /api/ads/generate         - Generate AI ads
GET    /api/ads                  - Get generated ads
```

### Campaigns
```
POST   /api/campaigns/create     - Create campaign
GET    /api/campaigns            - List campaigns
POST   /api/campaigns/{id}/launch - Launch to platform
```

### Direct Mail
```
POST   /api/direct-mail/send     - Send direct mail
GET    /api/direct-mail/pricing  - Get pricing
GET    /api/direct-mail/history  - Get send history
```

### AI Configuration
```
GET    /api/ai-config            - Get AI settings
PUT    /api/ai-config            - Update AI settings
POST   /api/ai-config/test       - Test AI generation
```

### Payments
```
POST   /api/subscription/create  - Create subscription
POST   /api/subscription/cancel  - Cancel subscription
POST   /api/subscription/request-refund - Request refund
POST   /api/leads/purchase       - Buy lead pack
POST   /api/webhooks/stripe      - Stripe webhook
```

---

## 🎨 FRONTEND COMPONENTS

### Page Structure

```
/                       - Dashboard (protected)
/login                  - Login page
/signup                 - Signup page
/pricing                - Pricing page
/onboarding             - Onboarding wizard
/scan/new               - Start new scan
/scan/:scanId           - Scan progress
/results/:scanId        - Scan results
/lead/:leadId           - Lead detail view
/sequences              - Sequence list
/sequences/new          - Sequence builder
/sequences/:id/edit     - Edit sequence
/campaigns              - Campaign list
/campaigns/new          - Campaign wizard
/ads                    - AI ad library
/direct-mail            - Direct mail history
/voice-calls            - Call history
/voice-calls/:id        - Call detail & transcript
/settings               - User settings
/settings/integrations  - Integration setup
/settings/ai-config     - AI customization
```

### Key Components

**SequenceBuilder.jsx** (Paragon-style)
```jsx
Features:
- Vertical node layout
- Auto-spacing between nodes
- Right-side panel (slides in on click)
- Node types: Email, SMS, Call, Wait, Condition, Research
- Drag nodes from palette
- Connect nodes automatically
- Visual flow indicators
- Real-time preview
- Save drafts
- Publish/activate
```

**AIConfigPanel.jsx**
```jsx
Sections:
- Voice Agent Settings
  - Voice selection (20+ options)
  - Tone, speed, pitch
  - Custom prompts (opening, objection, closing)
  - Thresholds (duration, objections)
  
- Email Settings
  - Tone, length, personalization
  - CTA style
  - Custom generation prompt
  
- SMS Settings
  - Tone, emoji usage
  - Custom prompt
  
- Company Voice
  - Voice description
  - Differentiators
  - Value props
  - Common objections
  
- Test Generation
  - Live preview
  - A/B comparison
```

**OnboardingWizard.jsx**
```jsx
Steps:
1. WelcomeStep - Value prop, features
2. BusinessInfoStep - Company details, branding
3. IntegrationsStep - Facebook, Google, n8n
4. FirstScanStep - Guided first scan
5. CompleteStep - Success, next actions

Features:
- Progress indicator
- "Get Help" floating button
- Skip option
- Beautiful transitions
- Persist progress
```

**LeadDetailView.jsx**
```jsx
Sections:
- Hero: Aerial image with annotations
- Roof Analysis: AI report, condition score
- Property Details: Address, age, value
- Contact Info: Name, phone, email (enrichment option)
- Action Buttons:
  - Click-to-Call
  - Click-to-Email
  - Send Direct Mail
  - Enroll in Sequence
  - AI Voice Call
- Activity Timeline
- Notes section
```

---

## 🚀 DEPLOYMENT STRATEGY

### Local Development

```bash
# Clone repository
git clone <repo>
cd fishmouth

# Setup environment
cp .env.example .env
# Edit .env with API keys

# Start services
docker-compose up -d

# Access
Frontend: http://localhost:3000
Backend: http://localhost:8000
n8n: http://localhost:5678
API Docs: http://localhost:8000/docs
```

### Production Deployment

**Option 1: Single Server (Recommended for start)**
```bash
# Server Requirements:
- 8GB RAM minimum
- 4 vCPU cores
- 100GB SSD storage
- Ubuntu 22.04 LTS

# Deploy
docker-compose -f docker-compose.prod.yml up -d

# Setup SSL with Let's Encrypt
certbot --nginx -d app.fishmouth.com -d api.fishmouth.com

# Configure domain DNS
app.fishmouth.com -> Server IP
api.fishmouth.com -> Server IP
```

**Option 2: Distributed (Scaling)**
```
- Frontend: Vercel / Netlify
- Backend: AWS ECS / GCP Cloud Run
- Database: RDS PostgreSQL
- Redis: ElastiCache
- n8n: Dedicated instance
- Voice Server: Separate instance (low latency)
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/fishmouth
REDIS_URL=redis://localhost:6379

# AI APIs
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
ELEVENLABS_API_KEY=xxxxx

# Communication
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890
DEEPGRAM_API_KEY=xxxxx

# Payments
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PROFESSIONAL_PRICE_ID=price_xxxxx
STRIPE_ENTERPRISE_PRICE_ID=price_xxxxx

# Marketing
LOB_API_KEY=live_xxxxx
MAPBOX_ACCESS_TOKEN=pk.xxxxx
GOOGLE_MAPS_API_KEY=AIzaSyxxxxx

# Security
JWT_SECRET_KEY=<256-bit-secret>

# n8n
N8N_USER=admin
N8N_PASSWORD=<secure-password>
N8N_HOST=n8n.fishmouth.com

# Server
SERVER_HOST=api.fishmouth.com
CORS_ORIGINS=https://app.fishmouth.com
```

---

## 🔗 INTEGRATION REQUIREMENTS

### Facebook Ads Integration

**Setup Steps:**
1. Create Facebook Business Manager account
2. Create Ad Account
3. Add System User
4. Generate Access Token with permissions:
   - ads_management
   - ads_read
   - business_management
5. Get Ad Account ID (starts with "act_")

**Implementation:**
- Use `facebook-business` Python SDK
- Store encrypted access token in database
- Create campaigns with postal code targeting
- Track campaign performance
- Auto-optimize based on results

### Google Ads Integration

**Setup Steps:**
1. Create Google Ads account
2. Enable Google Ads API
3. Create OAuth credentials
4. Get refresh token
5. Get Customer ID

**Implementation:**
- Use `google-ads` Python SDK
- OAuth flow for user authorization
- Create Search & Display campaigns
- Geo-targeting by postal code
- Performance tracking

### n8n Workflow Automation

**Pre-built Workflows:**

1. **Hot Lead Notification**
   - Trigger: Lead with 80+ score found
   - Actions: Email, Slack, SMS notification
   
2. **Ad Generation**
   - Trigger: Webhook from app
   - Actions: Generate ads, post to Facebook, notify user
   
3. **Campaign Launch**
   - Trigger: Campaign created
   - Actions: Create FB campaign, create Google campaign, send confirmation
   
4. **Lead Enrichment**
   - Trigger: New lead added
   - Actions: Enrich contact, update CRM, trigger sequence

5. **Daily Summary**
   - Trigger: Scheduled (daily 8am)
   - Actions: Generate report, email summary, update analytics

---

## 📚 SPECKIT IMPLEMENTATION

### What is Speckit?

Speckit is a documentation framework that helps AI assistants (like Claude, GPT-4) maintain comprehensive context about your codebase, making development more efficient and consistent.

### Speckit Structure for Fish Mouth

**/.speckit/project.yaml**
```yaml
name: Fish Mouth
type: web-application
stack:
  backend:
    - Python 3.11
    - FastAPI
    - SQLAlchemy
    - PostgreSQL
  frontend:
    - React 18
    - TailwindCSS
    - React Flow
  infrastructure:
    - Docker
    - Docker Compose
    - n8n
description: AI-powered roofing lead generation and sales automation platform
```

**/.speckit/architecture.md**
- System architecture diagrams
- Data flow
- Service dependencies
- API contract
- Database schema
- Integration points

**/.speckit/features/**.
```
lead-detection.md       - AI roof detection system
sequence-builder.md     - Marketing sequence automation
voice-agent.md          - AI voice calling system
onboarding.md          - User onboarding wizard
ai-config.md           - AI customization settings
campaign-manager.md    - Multi-platform campaigns
direct-mail.md         - Lob integration
```

**/.speckit/apis/**
```
authentication.md      - Auth endpoints & flows
leads.md              - Lead management APIs
sequences.md          - Sequence CRUD & execution
voice.md              - Voice calling APIs
ai-generation.md      - AI content generation
payments.md           - Stripe integration
```

**/.speckit/components/**
```
SequenceBuilder.md    - Paragon-style builder
AIConfigPanel.md      - AI settings interface
LeadDetailView.md     - Lead management UI
OnboardingWizard.md   - 5-step onboarding
Dashboard.md          - Main dashboard
```

**/.speckit/prompts/**
```
roof-analysis.md      - Claude Vision prompts
email-generation.md   - Email AI prompts
sms-generation.md     - SMS AI prompts
voice-script.md       - Voice agent prompts
research.md           - Lead research prompts
```

**/.speckit/deployment/**
```
local-setup.md        - Local development guide
docker-compose.md     - Container orchestration
production.md         - Production deployment
scaling.md            - Scaling strategy
monitoring.md         - Observability setup
```

### Speckit Best Practices for Fish Mouth

1. **Keep Context Files Updated**
   - Update after major features
   - Document breaking changes
   - Include migration guides

2. **Reference from Code**
   ```python
   # See .speckit/features/sequence-builder.md for architecture
   class SequenceEngine:
       pass
   ```

3. **Use for AI Pair Programming**
   - Reference speckit docs when asking AI for help
   - AI can understand full context quickly
   - Consistent code generation

4. **Document Decisions**
   - Why we chose certain technologies
   - Trade-offs made
   - Future considerations

---

## 🎯 DEVELOPMENT PRIORITIES

### Phase 1: MVP (Weeks 1-4) - ✅ **90% Complete**
- [x] User authentication (100%)
- [x] Lead detection system (90%)
- [x] Admin dashboard (100%)
- [x] Billing & usage tracking (100%)
- [x] Database foundation (100%)
- [x] Real-time activity stream (100%)
- [ ] Simple email sequences (70% - backend complete)
- [ ] Stripe payment integration (partial - usage tracking ready)

### Phase 2: Core Features (Weeks 5-8) - ⏳ **70% Complete**
- [ ] Advanced sequence builder (40% - backend 70%, UI 40%)
- [x] AI voice calling system (85% - core ready, streaming in progress)
- [x] Contagion analysis system (100%)
- [x] Report generation (100%)
- [x] Admin billing dashboard (100%)
- [ ] Facebook Ads integration (planned)
- [ ] Complete onboarding wizard (partial)
- [ ] AI customization settings (backend ready)

### Phase 3: Advanced Features (Weeks 9-12)
- [ ] n8n workflow templates
- [ ] Campaign analytics
- [ ] A/B testing for sequences
- [ ] White-label reporting
- [ ] API for integrations

### Phase 4: Scale & Optimize (Weeks 13+)
- [ ] Performance optimization
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] Multi-user accounts
- [ ] Reseller program

---

## 🐛 KNOWN ISSUES & TODO

### Critical
- [ ] Implement proper error handling for API failures
- [ ] Add rate limiting to prevent abuse
- [ ] Secure sensitive data encryption
- [ ] Add comprehensive logging

### High Priority
- [ ] Email deliverability optimization
- [ ] SMS opt-out handling (TCPA compliance)
- [ ] Call recording storage & retrieval
- [ ] Webhook retry logic

### Medium Priority
- [ ] Add search functionality to leads
- [ ] Export sequences as templates
- [ ] Duplicate sequence feature
- [ ] Bulk lead actions

### Low Priority
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Mobile responsive improvements
- [ ] Accessibility enhancements

---

## 📞 SUPPORT & DOCUMENTATION

### For Developers
- API Documentation: http://localhost:8000/docs
- Component Storybook: http://localhost:6006
- Database Schema: See ERD diagram in `/docs`

### For Users
- Help Center: https://help.fishmouth.com
- Video Tutorials: https://youtube.com/fishmouth
- Community Forum: https://community.fishmouth.com
- Email Support: support@fishmouth.com

### For Sales/Business
- Pricing Calculator: https://fishmouth.com/calculator
- ROI Guide: https://fishmouth.com/roi
- Case Studies: https://fishmouth.com/case-studies
- Partner Program: https://fishmouth.com/partners

---

## 📝 CHANGELOG

### v3.0.0 (Current - In Development)
- Added AI voice calling system
- Implemented Paragon-style sequence builder
- Added AI agent customization settings
- Implemented quality-based pricing model
- Added 30-day money-back guarantee
- Self-hosted infrastructure with Docker

### v2.0.0
- Added sequence automation
- Facebook Ads integration
- Direct mail via Lob
- Contact enrichment

### v1.0.0
- Initial release
- Basic lead detection
- Simple email campaigns
- Dashboard & reporting

---

## 🤝 CONTRIBUTING

This is a proprietary application. For internal development team only.

**Code Standards:**
- Python: PEP 8, type hints, docstrings
- JavaScript: ESLint, Prettier, JSDoc comments
- Commits: Conventional commits format
- Testing: 80%+ coverage required

**Review Process:**
1. Create feature branch
2. Write tests
3. Update documentation
4. Submit PR
5. Code review (2 approvals required)
6. Merge to main

---

## 📄 LICENSE

Proprietary - All Rights Reserved
© 2025 Fish Mouth Inc.

---

**Last Updated**: January 10, 2025  
**Maintained By**: Development Team  
**Next Review**: January 24, 2025
