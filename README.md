# 🏠 Fish Mouth - AI-Powered Roofing Lead Generation Platform

**Version 3.0** | Self-Hosted | AI-First | Quality-Based Pricing

---

## 🎯 What is Fish Mouth?

Fish Mouth is a comprehensive lead generation and sales automation platform designed specifically for roofing contractors. It uses AI to analyze aerial imagery, identify aged roofs, generate high-quality leads, create persuasive marketing materials, and automate complete sales sequences including AI voice calls.

### Key Features

- 🤖 **AI Roof Detection** - Claude Vision analyzes aerial imagery to identify aged roofs
- 📊 **Quality-Based Pricing** - Only pay for leads with 60+ quality score
- 📧 **Intelligent Sequences** - Automate email, SMS, calls with AI-generated content
- 📞 **AI Voice Agent** - Automated sales calls with objection handling
- 🎨 **Campaign Management** - Facebook & Google Ads integration
- 💌 **Direct Mail** - Automated postcard & letter sending
- 🎯 **Lead Scoring** - 0-100 score based on roof age, condition, property value

---

## 🔍 Roof Analysis Pipeline

Fish Mouth now ships with a production-ready roof intelligence stack that combines property data, satellite imagery, and computer vision to surface the highest-intent opportunities.

### How it Works

1. **Property Discovery** – The scan service queries Mapbox (or OpenStreetMap/Nominatim) to obtain exact coordinates for every residential address in the target market.  
2. **Property Enrichment** – Each candidate is enriched with year built, home value, square footage, and historical roof data via Estated (or deterministic fallbacks).  
3. **Imagery Capture** – High-resolution aerial images are pulled from Mapbox Satellite with automatic Google Static Maps fallback and cached locally for auditing.  
4. **Computer Vision Analysis** – A NumPy/Pillow pipeline evaluates granule loss, dark streaks, moss growth, texture variance, and edge density to estimate roof age, condition, and urgency.  
5. **Contact Enrichment** – Owner name, phone, and email are appended through TruePeopleSearch (or deterministic fallback) with confidence scoring.  
6. **Scoring Engine** – A weighted model blends roof health, age, property value, damage indicators, and contact confidence into the final 0-100 lead score + HOT/WARM/COLD priority.

Every lead returned to the dashboard includes a full AI summary, damage indicators, imagery provenance, scoring breakdown, and booking-value estimate so sales teams can move immediately.

### Required Environment Variables

Set the following in `.env` to enable live enrichment:

| Variable | Purpose |
| --- | --- |
| `MAPBOX_TOKEN` | Access token for high-res satellite tiles & geocoding |
| `GOOGLE_MAPS_API_KEY` | Backup imagery provider (optional but recommended) |
| `PROPERTY_ENRICHMENT_API_KEY` | Estated (or equivalent) API key for property records |
| `CONTACT_ENRICHMENT_API_KEY` | TruePeopleSearch (or similar) API key for homeowner contacts |
| `TELNYX_API_KEY` | Telnyx API key for SMS/voice call control |
| `TELNYX_MESSAGING_PROFILE_ID` | Telnyx messaging profile to send outbound SMS |
| `TELNYX_CALL_CONTROL_APP_ID` | Telnyx call control application (for outbound/inbound calls) |
| `TELNYX_FROM_NUMBER` | Verified Telnyx number used as the caller ID |
| `TELNYX_WEBHOOK_SECRET` | Shared secret used to verify legacy Telnyx webhook callbacks (HMAC) |
| `TELNYX_WEBHOOK_PUBLIC_KEY` | Ed25519 public key used to verify Telnyx webhook signatures |
| `PII_HASH_SALT` | Optional salt used when hashing PII (phone/email) for compliance |
| `PII_ENCRYPTION_KEY` | Base64 Fernet key for encrypting stored PII (generate via `python -m cryptography.fernet`) |
| `STRIPE_SECRET_KEY` | Stripe API secret used for usage-based billing |
| `STRIPE_PRICE_ID` | Stripe metered price ID associated with your subscription plan |
| `STORAGE_BASE_URL` | (Optional) Public URL prefix for served aerial imagery |

If any of these are omitted the system gracefully falls back to deterministic synthetic data to keep demos running while you secure credentials.

---

## 📊 Dashboard & Workflow Enhancements

- **Export Anything** — Download filtered lead lists or per-scan CSVs directly from the dashboard for quick sharing with your crews.  
- **Real-Time AI Activity Feed** — Track every AI touchpoint (calls, emails, SMS, sequence outcomes) in a single timeline sourced from the new `/api/activities` endpoint.  
- **Scan Result Workspace** — Dedicated view for each area scan with summary analytics, damage distribution, and tabular leads enriched with imagery, contact data, and scores.  
- **Voice Agent Console** — Monitor AI voice calls, outcomes, and duration metrics from the `Voice Calls` tab without leaving the app.  
- **Production-Ready Sequences** — Redesigned React Flow builder with auto-layout, richer content editors, and a hardened backend executor so sequences run end-to-end in production.

---

## 📚 Documentation

### For Developers

1. **Start Here**: [`FISH MOUTH_MASTER_SPEC.md`](FISH MOUTH_MASTER_SPEC.md)
   - Complete system specification
   - Architecture overview
   - All features documented
   - Database schema
   - API endpoints

2. **AI Assistant Setup**: [`SETUP_FOR_AI_ASSISTANTS.md`](SETUP_FOR_AI_ASSISTANTS.md)
   - How to use with Cursor
   - How to use with Claude Code
   - Context file locations
   - Best practices

3. **Detailed Documentation**: [`.speckit/`](.speckit/)
   - Feature documentation
   - API specifications
   - Component designs
   - AI prompt templates
   - Deployment guides

### Quick Links

- **For Cursor Users**: [`.cursor/context.md`](.cursor/context.md)
- **For Claude Code Users**: [`.claude/project-context.md`](.claude/project-context.md)
- **Speckit Overview**: [`.speckit/README.md`](.speckit/README.md)
- **Admin Billing API**: `GET /api/admin/billing/usage`, `GET /api/admin/billing/users/{id}`, `GET /api/admin/billing/summary`, `POST /api/admin/billing/users/{id}/provision`, exports at `/api/admin/billing/export` and `/api/admin/billing/export/period`

---

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- 8GB RAM minimum
- API Keys (see below)

### 1. Clone & Setup

```bash
cd /home/yogi/fishmouth
cp .env.example .env
# Edit .env with your API keys
```

### 2. Get API Keys

Required:
- **Anthropic** (Claude AI): https://console.anthropic.com
- **ElevenLabs** (Voice): https://elevenlabs.io
- **Telnyx** (Calls/SMS): https://telnyx.com
- **Deepgram** (Speech-to-text): https://deepgram.com
- **Stripe** (Payments): https://stripe.com
- **Mapbox** (Imagery): https://mapbox.com

### 3. Configure Telnyx Webhooks

Point your Telnyx Call Control & Messaging webhooks to:

- `POST https://<your-domain>/api/webhooks/telnyx`

Provide the same `TELNYX_WEBHOOK_SECRET` or `TELNYX_WEBHOOK_PUBLIC_KEY` you added to `.env`; the API verifies `Telnyx-Signature-Ed25519` headers (falling back to `Telnyx-Signature-256` HMAC when a public key is not configured).

For real-time audio streaming, Telnyx Call Control should be instructed to stream to:

- `wss://<your-domain>/api/voice/stream/{call_id}`

The backend waits for that stream before bridging audio into Deepgram/ElevenLabs.
- **Google Maps** (Geocoding): https://console.cloud.google.com
- **Lob** (Direct Mail): https://lob.com

### 3. Start Services

```bash
docker-compose up -d
```

Access:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **n8n**: http://localhost:5678

### 4. Create Admin Account

Visit http://localhost:3000/signup and create your first account.

---

## 💰 Pricing Model

### For End Users

**Free Trial**
- 5 free quality leads
- 14 days
- No credit card required

**Professional** - $299/month
- Unlimited scans
- $1.13 per quality lead (60+ score)
- Leads below 60 are FREE
- All features included

**Enterprise** - $999/month
- Everything in Professional
- $0.90 per quality lead (20% discount)
- Dedicated support
- API access

### 30-Day Money-Back Guarantee

Not satisfied with lead quality? Full refund within 30 days.

---

## 🏗️ Architecture

```
Frontend (React) ──┐
                   ├──> Backend (FastAPI) ──┐
AI Voice Server ───┘                        ├──> PostgreSQL
                                            ├──> Redis
                                            └──> n8n
External Services:
- Claude (AI)
- ElevenLabs (Voice)
- Telnyx (Calls/SMS)
- Deepgram (STT)
- Stripe (Payments)
- Lob (Direct Mail)
- Mapbox (Imagery)
```

### Self-Hosted Components

All running in Docker:
1. PostgreSQL - Primary database
2. Redis - Caching & queues
3. n8n - Workflow automation
4. Backend API - FastAPI server
5. Celery Workers - Background jobs
6. Frontend - React SPA
7. AI Voice Server - Custom voice service

---

## 🛠️ Technology Stack

### Backend
- Python 3.11
- FastAPI
- SQLAlchemy
- PostgreSQL 15
- Redis 7
- Celery

### Frontend
- React 18
- TailwindCSS 3
- React Flow
- React Router 6

### AI & ML
- Anthropic Claude Sonnet 4
- ElevenLabs (Voice)
- Deepgram (STT)
- OpenCV (Image Processing)

### Infrastructure
- Docker & Docker Compose
- Nginx (Production)
- n8n (Automation)

---

## 📖 Key Concepts

### Lead Scoring (0-100)

```
Score = (Roof Age × 0.4) + (Damage × 0.3) + (Property Value × 0.15) + (Location × 0.15)
```

- **HOT (80-100)**: Immediate action required
- **WARM (60-79)**: Good opportunity  
- **COLD (<60)**: Not charged, not saved

### Quality-Based Pricing

- Only charge for leads with 60+ score
- Leads below 60 are FREE (not saved)
- 80% profit margin ($1.13 charge vs $0.225 cost)

### Sequence Automation

- Vertical node-based builder (Paragon-style)
- AI generates content at each step
- Node types: Email, SMS, Call, Wait, Condition, Research
- Respects working hours & time zones

### AI Voice Agent

- Natural conversation using Claude Sonnet 4
- ElevenLabs for voice synthesis
- Handles objections automatically
- Schedules appointments
- Generates call summaries
- Telnyx call-control streams bridged to Deepgram/ElevenLabs in real time via FastAPI websockets
- Ed25519 webhook verification, failover retries, and transcript playback inside the console

---

## 🤖 Working with AI Assistants

### Using Cursor

```
cursor /home/yogi/fishmouth
```

Then in chat:
```
"Read .cursor/context.md and FISH MOUTH_MASTER_SPEC.md. 
I need help implementing the sequence builder."
```

### Using Claude Code

Open project, then in chat:
```
"Read .claude/project-context.md for full context. 
Help me implement the AI voice calling system."
```

See [`SETUP_FOR_AI_ASSISTANTS.md`](SETUP_FOR_AI_ASSISTANTS.md) for detailed guide.

---

## 📂 Project Structure

```
/home/yogi/fishmouth/
├── FISH MOUTH_MASTER_SPEC.md       # Complete specification
├── SETUP_FOR_AI_ASSISTANTS.md  # AI assistant guide
├── README.md                    # This file
├── .speckit/                    # Detailed documentation
│   ├── project.yaml
│   ├── features/
│   ├── apis/
│   ├── components/
│   ├── prompts/
│   └── deployment/
├── .cursor/context.md           # Cursor context
├── .claude/project-context.md   # Claude context
├── backend/                     # Python/FastAPI
├── frontend/                    # React
├── ai-voice-server/             # Voice service
├── docker-compose.yml           # Deployment
└── .env                         # Configuration
```

---

## 🔧 Development

### Local Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Backend Development

```bash
cd backend
uvicorn main:app --reload
```

In a separate shell, start Celery workers and (optionally) beat for scheduled jobs:

```bash
celery -A backend.celery_app.celery_app worker --loglevel=info
celery -A backend.celery_app.celery_app beat --loglevel=info
```

### Frontend Development

```bash
cd frontend
npm start
```

### Database Migrations

```bash
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

---

## 🚀 Deployment

See [`.speckit/deployment/`](.speckit/deployment/) for detailed guides.

### Production

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Requirements

- VPS with 8GB+ RAM
- Ubuntu 22.04 LTS
- Docker & Docker Compose
- SSL certificate (Let's Encrypt)

---

## 📊 Cost Analysis

### Per Lead Costs

```
API Costs:
- Mapbox imagery:      $0.005
- Claude analysis:     $0.015
- Google Maps:         $0.005
- Property data:       $0.100
- Contact enrichment:  $0.100
─────────────────────────────
Total:                 $0.225
```

### Revenue

```
Professional: $1.13 - $0.225 = $0.905 (80% margin)
Enterprise:   $0.90 - $0.225 = $0.675 (75% margin)
```

---

## 🤝 Contributing

This is a proprietary application. For internal development team only.

### Code Standards

- **Python**: PEP 8, type hints, docstrings
- **JavaScript**: ESLint, Prettier, JSDoc
- **Commits**: Conventional commits format
- **Testing**: 80%+ coverage required

---

## 📄 License

Proprietary - All Rights Reserved  
© 2025 Fish Mouth Inc.

---

## 📞 Support

- **Documentation**: See `.speckit/` directory
- **API Docs**: http://localhost:8000/docs
- **Issues**: Internal issue tracker
- **Email**: dev@fishmouth.com

---

## 🎯 Current Status

**Version**: 3.0 (In Development)

**Phase 2 - Core Features:**
- ⏳ Sequence builder (Paragon-style vertical layout)
- ⏳ AI voice calling system
- ⏳ AI customization settings
- ⏳ Complete onboarding wizard

See TODO list for detailed progress.

---

**Built with ❤️ using AI-first principles**

For complete documentation, see [`FISH MOUTH_MASTER_SPEC.md`](FISH MOUTH_MASTER_SPEC.md)
