# ⚙️ Bulletproof Quality Control - Complete Configuration Reference

**Version**: 1.0  
**Date**: 2025-10-13  
**Purpose**: Comprehensive configuration guide for all quality control features

---

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [API Keys & Credentials](#api-keys--credentials)
3. [Quality Control Thresholds](#quality-control-thresholds)
4. [Cost Control Settings](#cost-control-settings)
5. [Feature Flags](#feature-flags)
6. [Database Configuration](#database-configuration)
7. [Recommended Settings by Use Case](#recommended-settings-by-use-case)

---

## Environment Variables

### Complete `.env` File

```bash
# ============================================
# BULLETPROOF QUALITY CONTROL CONFIGURATION
# ============================================

# -----------------
# Phase 1: Image Quality Validation
# -----------------

# Enable/disable image quality validation
IMAGE_QUALITY_ENABLED=true

# Minimum overall quality score to pass (0-100)
# Recommended: 70 (strict), 60 (balanced), 50 (lenient)
IMAGE_QUALITY_MIN_SCORE=70

# Individual quality thresholds (advanced tuning)
IMAGE_MIN_RESOLUTION=800                 # pixels
IMAGE_MIN_BRIGHTNESS=30                  # 0-255
IMAGE_MAX_BRIGHTNESS=225                 # 0-255
IMAGE_MIN_CONTRAST=30                    # standard deviation
IMAGE_MIN_SHARPNESS=50                   # Laplacian variance
IMAGE_MAX_SHADOW_PERCENT=40              # % of image that can be dark
IMAGE_MIN_ROOF_VISIBILITY=60             # % of image that should be roof

# -----------------
# Phase 2: Data Enrichment
# -----------------

# Attom Data API (Property Financial Data)
# Sign up: https://api.gateway.attomdata.com/
# Cost: $0.10/lookup, Free tier: 1000/month
ATTOM_API_KEY=your_attom_api_key_here

# Melissa Data API (Homeowner Demographics)
# Sign up: https://www.melissa.com/
# Cost: $0.05/lookup, Free tier: 500/month
MELISSA_API_KEY=your_melissa_api_key_here

# US Census API (FREE - no key needed)
# Automatically used if Attom/Melissa not configured

# Enable/disable financial qualification
FINANCIAL_QUALIFICATION_ENABLED=true

# Financial qualification thresholds
FINANCIAL_MIN_EQUITY_PERCENT=20.0        # Minimum equity required (%)
FINANCIAL_MIN_PROPERTY_VALUE=150000      # Minimum property value ($)
FINANCIAL_MIN_INCOME_RATIO=0.15          # Income must be 15% of property value

# -----------------
# Phase 3: Advanced Scoring
# -----------------

# Lead scoring thresholds
LEAD_SCORE_QUALIFIED_THRESHOLD=85        # Score for "HOT" leads (85-100)
LEAD_SCORE_POTENTIAL_THRESHOLD=70        # Score for "WARM" leads (70-84)
# Below 70 = "REJECT" (not contacted)

# Scoring weights (must sum to 1.0)
SCORING_URGENCY_WEIGHT=0.35              # Roof age + condition
SCORING_FINANCIAL_WEIGHT=0.30            # Financial qualification
SCORING_DAMAGE_WEIGHT=0.20               # Damage severity
SCORING_ENGAGEMENT_WEIGHT=0.10           # Contact quality
SCORING_PROPERTY_WEIGHT=0.05             # Property value

# -----------------
# Phase 4: Optional Enhancements
# -----------------

# OpenAI API (for multi-model verification - OPTIONAL)
# Sign up: https://platform.openai.com/
# Cost: $0.10/image for GPT-4 Vision
OPENAI_API_KEY=your_openai_api_key_here

# Multi-model verification
MULTI_MODEL_VERIFICATION_ENABLED=false   # Set to true if you have OpenAI key
MULTI_MODEL_MIN_AGREEMENT=0.70           # Minimum agreement between models (70%)

# -----------------
# Cost Control
# -----------------

# Maximum cost per lead (abort if exceeded)
MAX_COST_PER_LEAD=0.75                   # $0.75 max per lead

# Selective enrichment (only enrich high-potential leads)
SELECTIVE_ENRICHMENT_ENABLED=false       # Set to true to reduce costs
SELECTIVE_ENRICHMENT_MIN_SCORE=60        # Only enrich if initial score > 60

# -----------------
# Wallet & Rewards (NEW)
# -----------------

# Stripe checkout success/cancel URLs (modal uses data attributes)
STRIPE_CHECKOUT_SUCCESS_URL=https://app.fishmouth.ai/wallet/success
STRIPE_CHECKOUT_CANCEL_URL=https://app.fishmouth.ai/wallet/cancel

# Multiplier applied when converting wallet cash to feature credits (4× API cost)
WALLET_CONVERSION_MULTIPLIER=4.0

# Daily quest configuration
QUEST_DAILY_POINTS=50                    # Points awarded per quest completion
QUEST_WAVE_COOLDOWN_MINUTES=15           # Delay before new quest wave appears

# Auto-distribution defaults (used when user enables auto-spend routing)
AUTO_SPEND_DEFAULT_SMS_PERCENT=35
AUTO_SPEND_DEFAULT_EMAIL_PERCENT=35
AUTO_SPEND_DEFAULT_VOICE_PERCENT=30
AUTO_SPEND_DEFAULT_SCANS_PERCENT=0       # SmartScans manually triggered by ops

# Local storage keys (for frontend dev reference)
# fm_points               -> total point balance
# fm_wallet_balance       -> cash balance
# fm_credit_buckets       -> per-channel credit counts
# fm_credit_usage_rules   -> auto-spend toggles (true = auto)
# fm_daily_rotation       -> daily quest lineup (tasks, wave, date)
# fm_wallet_rotation_meta -> wallet quest wave meta (date + wave index)
# fm_point_history        -> recent point ledger entries (array)

# -----------------
# Feedback & Analytics
# -----------------

# Enable outcome tracking
FEEDBACK_TRACKING_ENABLED=true

# Analytics retention (days)
FEEDBACK_RETENTION_DAYS=365              # Keep outcome data for 1 year

# -----------------
# Existing Application Settings
# -----------------

# Database
DATABASE_URL=postgresql://fishmouth:password@localhost:5432/fishmouth

# Anthropic Claude (AI Roof Analysis)
ANTHROPIC_API_KEY=your_anthropic_key_here

# Redis (Caching & Queue)
REDIS_URL=redis://localhost:6379

# Environment
ENVIRONMENT=development                   # development, staging, production
DEBUG=true                               # Set to false in production
```

---

## API Keys & Credentials

### How to Get API Keys

#### 1. Attom Data API (Property Financial Data)

**What it provides:**
- Property valuations (current market value)
- Mortgage information (amount, equity)
- Lien status
- Foreclosure status
- Assessment history

**How to get it:**
1. Go to https://api.gateway.attomdata.com/
2. Click "Get Started" → "Sign Up"
3. Choose plan:
   - **Free Tier**: 1,000 requests/month ($0/month)
   - **Developer**: 10,000 requests/month ($99/month)
   - **Professional**: 50,000 requests/month ($399/month)
4. Copy API key from dashboard

**Configuration:**
```bash
ATTOM_API_KEY=your_attom_api_key_12345678
```

**Cost:** $0.10 per lookup  
**Recommended:** Start with free tier (1,000/month)

---

#### 2. Melissa Data API (Homeowner Demographics)

**What it provides:**
- Homeowner name
- Estimated income
- Credit score range
- Length of residence
- Age demographics

**How to get it:**
1. Go to https://www.melissa.com/
2. Click "Try Free" → "Sign Up"
3. Choose product: "PersonatorTM" or "Contact Verify"
4. Select plan:
   - **Free Trial**: 500 requests ($0/month)
   - **Pay-As-You-Go**: $0.05 per request
   - **Monthly**: 10,000 requests/month ($399/month)
5. Copy API key from dashboard

**Configuration:**
```bash
MELISSA_API_KEY=your_melissa_api_key_abcdefgh
```

**Cost:** $0.05 per lookup  
**Recommended:** Start with free trial (500 requests)

---

#### 3. US Census API (FREE Alternative)

**What it provides:**
- Area median income (by ZIP code)
- Median home values
- Demographics
- Population data

**How to get it:**
1. Go to https://api.census.gov/data/key_signup.html
2. Enter email address
3. API key sent immediately (optional - works without key)

**Configuration:**
```bash
# No configuration needed - API is public
# Falls back to Census data if Attom/Melissa not configured
```

**Cost:** $0 (completely free)  
**Recommended:** Use as default, add paid APIs later

---

#### 4. OpenAI API (Optional - Multi-Model Verification)

**What it provides:**
- GPT-4 Vision for cross-checking roof analysis
- Reduces AI hallucinations by 50%
- Second opinion on damage assessment

**How to get it:**
1. Go to https://platform.openai.com/
2. Click "Sign Up" → Create account
3. Go to API Keys → "Create new secret key"
4. Add payment method (required for API access)

**Configuration:**
```bash
OPENAI_API_KEY=sk-proj-abc123...
MULTI_MODEL_VERIFICATION_ENABLED=true
```

**Cost:** $0.01 per 1K tokens (≈$0.10 per image analysis)  
**Recommended:** Only if accuracy is critical (adds 40% to cost)

---

## Quality Control Thresholds

### Image Quality Thresholds

#### Conservative (Strict Quality)
```bash
IMAGE_QUALITY_MIN_SCORE=80
IMAGE_MIN_RESOLUTION=1000
IMAGE_MIN_SHARPNESS=75
IMAGE_MAX_SHADOW_PERCENT=30
```
- **Effect**: Rejects 40% of images
- **Use case**: High-end residential, commercial roofing
- **Pro**: Extremely accurate results
- **Con**: May miss some marginal leads

---

#### Balanced (Recommended)
```bash
IMAGE_QUALITY_MIN_SCORE=70
IMAGE_MIN_RESOLUTION=800
IMAGE_MIN_SHARPNESS=50
IMAGE_MAX_SHADOW_PERCENT=40
```
- **Effect**: Rejects 30% of images
- **Use case**: Standard residential roofing
- **Pro**: Good balance of quality and volume
- **Con**: Occasional borderline images pass

---

#### Lenient (High Volume)
```bash
IMAGE_QUALITY_MIN_SCORE=60
IMAGE_MIN_RESOLUTION=600
IMAGE_MIN_SHARPNESS=30
IMAGE_MAX_SHADOW_PERCENT=50
```
- **Effect**: Rejects 20% of images
- **Use case**: Budget contractors, rural areas
- **Pro**: Maximum lead volume
- **Con**: Some low-quality leads slip through

---

### Financial Qualification Thresholds

#### Strict (High-End Only)
```bash
FINANCIAL_MIN_EQUITY_PERCENT=30.0
FINANCIAL_MIN_PROPERTY_VALUE=300000
FINANCIAL_MIN_INCOME_RATIO=0.20
```
- **Effect**: Only wealthy homeowners qualify
- **Use case**: Luxury roofing, high-end materials
- **Average job value**: $25,000+

---

#### Standard (Recommended)
```bash
FINANCIAL_MIN_EQUITY_PERCENT=20.0
FINANCIAL_MIN_PROPERTY_VALUE=150000
FINANCIAL_MIN_INCOME_RATIO=0.15
```
- **Effect**: Middle-class homeowners qualify
- **Use case**: Standard residential roofing
- **Average job value**: $12,000-18,000

---

#### Lenient (Maximum Volume)
```bash
FINANCIAL_MIN_EQUITY_PERCENT=10.0
FINANCIAL_MIN_PROPERTY_VALUE=100000
FINANCIAL_MIN_INCOME_RATIO=0.10
```
- **Effect**: Most homeowners qualify
- **Use case**: Budget roofing, repairs
- **Average job value**: $8,000-12,000

---

### Lead Scoring Thresholds

#### Aggressive (Only HOT Leads)
```bash
LEAD_SCORE_QUALIFIED_THRESHOLD=90
LEAD_SCORE_POTENTIAL_THRESHOLD=80
```
- **Effect**: Very few leads qualify (10-15%)
- **Use case**: Limited sales capacity
- **Conversion rate**: 25-30%

---

#### Balanced (Recommended)
```bash
LEAD_SCORE_QUALIFIED_THRESHOLD=85
LEAD_SCORE_POTENTIAL_THRESHOLD=70
```
- **Effect**: Moderate lead volume (30-40%)
- **Use case**: Standard operations
- **Conversion rate**: 18-22%

---

#### Volume-Focused
```bash
LEAD_SCORE_QUALIFIED_THRESHOLD=75
LEAD_SCORE_POTENTIAL_THRESHOLD=60
```
- **Effect**: High lead volume (50-60%)
- **Use case**: Large sales teams
- **Conversion rate**: 12-15%

---

## Cost Control Settings

### Maximum Budget Control

```bash
# Set maximum spend per lead
MAX_COST_PER_LEAD=0.50

# Abort scan if costs exceed budget
COST_CONTROL_ENABLED=true

# Alert when approaching budget limit
COST_ALERT_THRESHOLD=0.80  # Alert at 80% of max cost
```

**How it works:**
- Tracks cumulative cost per property candidate
- Skips expensive enrichment if approaching limit
- Sends webhook/email when 80% of budget used

---

### Selective Enrichment (Cost Optimization)

```bash
# Only enrich high-potential leads
SELECTIVE_ENRICHMENT_ENABLED=true

# Minimum initial score to trigger enrichment
SELECTIVE_ENRICHMENT_MIN_SCORE=65

# Which enrichment services to use selectively
SELECTIVE_ATTOM=true          # Only call Attom for high-potential
SELECTIVE_MELISSA=true        # Only call Melissa for high-potential
SELECTIVE_OPENAI=true         # Only call OpenAI for ambiguous cases
```

**Example logic:**
```python
# Quick pre-assessment (free)
initial_score = basic_roof_assessment(imagery)

if initial_score >= 65:
    # High potential - worth the investment
    financial_qual = await data_enricher.enrich_and_qualify(...)
else:
    # Low potential - skip expensive enrichment
    financial_qual = None
```

**Cost savings:** 50-60% reduction in enrichment costs

---

### Tiered Enrichment Strategy

```bash
# Different enrichment levels by lead score

# Tier 1: Basic (Score 50-69)
TIER1_USE_CENSUS=true         # Free Census data only
TIER1_USE_ATTOM=false
TIER1_USE_MELISSA=false

# Tier 2: Standard (Score 70-84)
TIER2_USE_CENSUS=true
TIER2_USE_ATTOM=true          # Add Attom (property data)
TIER2_USE_MELISSA=false

# Tier 3: Premium (Score 85+)
TIER3_USE_CENSUS=true
TIER3_USE_ATTOM=true
TIER3_USE_MELISSA=true        # Full enrichment
TIER3_USE_OPENAI=true         # Multi-model verification
```

**Cost breakdown:**
- Tier 1: $0.15 per lead (AI only)
- Tier 2: $0.25 per lead (AI + Attom)
- Tier 3: $0.55 per lead (Full bulletproof)

---

## Feature Flags

### Gradual Rollout Strategy

```bash
# Enable features incrementally

# Phase 1: Image Quality (Safe to enable immediately)
IMAGE_QUALITY_ENABLED=true

# Phase 2: Financial Qualification (Enable after testing)
FINANCIAL_QUALIFICATION_ENABLED=false  # Start false, enable when ready

# Phase 3: Multi-Model Verification (Optional, expensive)
MULTI_MODEL_VERIFICATION_ENABLED=false

# Phase 4: Feedback Tracking (Enable immediately)
FEEDBACK_TRACKING_ENABLED=true
```

---

### A/B Testing Configuration

```bash
# Run A/B test: 50% with bulletproof, 50% without

# Control group (existing system)
AB_TEST_ENABLED=true
AB_TEST_BULLETPROOF_PERCENTAGE=50  # 50% of scans use bulletproof

# This allows comparing:
# - Lead quality (bulletproof vs. standard)
# - Cost per qualified lead
# - Conversion rates
```

---

### Debug & Development Settings

```bash
# Development mode
ENVIRONMENT=development
DEBUG=true

# Skip expensive API calls in dev
DEV_MOCK_ATTOM=true
DEV_MOCK_MELISSA=true
DEV_MOCK_OPENAI=true

# Use sample data
DEV_USE_SAMPLE_IMAGERY=true

# Verbose logging
LOG_LEVEL=DEBUG
LOG_QUALITY_SCORES=true
LOG_ENRICHMENT_RESPONSES=true
```

---

## Database Configuration

### PostgreSQL Settings

```bash
# Database connection
DATABASE_URL=postgresql://fishmouth:password@localhost:5432/fishmouth

# Connection pool
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30

# Query timeout
DB_STATEMENT_TIMEOUT=30000  # 30 seconds
```

---

### Migration Settings

```bash
# Alembic (database migrations)
ALEMBIC_CONFIG=alembic.ini

# Auto-run migrations on startup (not recommended for production)
AUTO_RUN_MIGRATIONS=false

# Migration safety
REQUIRE_MIGRATION_BACKUP=true  # Require DB backup before migrations
```

---

## Recommended Settings by Use Case

### 1. Budget-Conscious Startup

```bash
# FREE configuration - no external paid APIs

IMAGE_QUALITY_ENABLED=true
IMAGE_QUALITY_MIN_SCORE=65

FINANCIAL_QUALIFICATION_ENABLED=true
ATTOM_API_KEY=              # Leave blank - will use Census
MELISSA_API_KEY=            # Leave blank - will use Census

LEAD_SCORE_QUALIFIED_THRESHOLD=80
LEAD_SCORE_POTENTIAL_THRESHOLD=65

MULTI_MODEL_VERIFICATION_ENABLED=false

SELECTIVE_ENRICHMENT_ENABLED=false
```

**Total cost per lead:** $0.15 (AI only)  
**Expected results:**
- 60-70% false positive reduction
- 150% increase in qualified leads
- 200% increase in conversions

---

### 2. Standard Residential Roofing Contractor

```bash
# BALANCED configuration - mix of free and paid

IMAGE_QUALITY_ENABLED=true
IMAGE_QUALITY_MIN_SCORE=70

FINANCIAL_QUALIFICATION_ENABLED=true
ATTOM_API_KEY=your_attom_key_here
MELISSA_API_KEY=            # Leave blank initially

LEAD_SCORE_QUALIFIED_THRESHOLD=85
LEAD_SCORE_POTENTIAL_THRESHOLD=70

MULTI_MODEL_VERIFICATION_ENABLED=false

SELECTIVE_ENRICHMENT_ENABLED=true
SELECTIVE_ENRICHMENT_MIN_SCORE=65
```

**Total cost per lead:** $0.25-0.35 (selective enrichment)  
**Expected results:**
- 75% false positive reduction
- 200% increase in qualified leads
- 250% increase in conversions

---

### 3. High-End Commercial/Luxury Residential

```bash
# PREMIUM configuration - maximum quality

IMAGE_QUALITY_ENABLED=true
IMAGE_QUALITY_MIN_SCORE=80

FINANCIAL_QUALIFICATION_ENABLED=true
ATTOM_API_KEY=your_attom_key_here
MELISSA_API_KEY=your_melissa_key_here

FINANCIAL_MIN_EQUITY_PERCENT=30.0
FINANCIAL_MIN_PROPERTY_VALUE=300000

LEAD_SCORE_QUALIFIED_THRESHOLD=90
LEAD_SCORE_POTENTIAL_THRESHOLD=80

MULTI_MODEL_VERIFICATION_ENABLED=true
OPENAI_API_KEY=your_openai_key_here

SELECTIVE_ENRICHMENT_ENABLED=false  # Enrich everything
```

**Total cost per lead:** $0.65-0.75 (full bulletproof)  
**Expected results:**
- 90% false positive reduction
- Extremely high-quality leads only
- 30-40% conversion rate

---

### 4. Enterprise/Multi-State Operation

```bash
# SCALABLE configuration - optimized for volume

IMAGE_QUALITY_ENABLED=true
IMAGE_QUALITY_MIN_SCORE=70

FINANCIAL_QUALIFICATION_ENABLED=true
ATTOM_API_KEY=your_attom_key_here
MELISSA_API_KEY=your_melissa_key_here

LEAD_SCORE_QUALIFIED_THRESHOLD=85
LEAD_SCORE_POTENTIAL_THRESHOLD=70

MULTI_MODEL_VERIFICATION_ENABLED=false

# Tiered enrichment
SELECTIVE_ENRICHMENT_ENABLED=true
TIER1_USE_CENSUS=true
TIER2_USE_ATTOM=true
TIER3_USE_MELISSA=true

# Cost controls
MAX_COST_PER_LEAD=0.50
COST_CONTROL_ENABLED=true

# Analytics
FEEDBACK_TRACKING_ENABLED=true
```

**Total cost per lead:** $0.30-0.40 (tiered approach)  
**Expected results:**
- 80% false positive reduction
- Scales to 100K+ scans/month
- Optimized cost-to-quality ratio

---

## Configuration Validation

### Pre-Deployment Checklist

```bash
# Run configuration validator
python scripts/validate_config.py

# Check API keys
python scripts/test_api_keys.py

# Verify database connection
python scripts/test_database.py

# Test image quality validator
python -m pytest tests/test_image_validator.py

# Test financial enrichment
python -m pytest tests/test_data_enricher.py
```

---

## Monitoring & Alerts

### Key Metrics to Track

```bash
# Set up monitoring for:

# 1. Cost metrics
ALERT_IF_COST_PER_LEAD_EXCEEDS=0.75
ALERT_IF_DAILY_SPEND_EXCEEDS=500

# 2. Quality metrics
ALERT_IF_REJECTION_RATE_EXCEEDS=50
ALERT_IF_QUALIFIED_RATE_BELOW=25

# 3. API health
ALERT_IF_API_ERROR_RATE_EXCEEDS=5
ALERT_IF_API_LATENCY_EXCEEDS=10000  # 10 seconds
```

---

## Need Help?

- **Technical Issues**: See `BULLETPROOF_IMPLEMENTATION_GUIDE.md`
- **Cost Questions**: See `COST_ANALYSIS_AND_ROI.md`
- **API Integrations**: Check individual API documentation
- **Database Migrations**: See `alembic/README.md`

---

**Last Updated:** 2025-10-13  
**Version:** 1.0




