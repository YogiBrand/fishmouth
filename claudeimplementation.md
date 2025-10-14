# 🏗️ **COMPLETE ROOFING PLATFORM SPECIFICATION**
## **Comprehensive Feature & Implementation Document**

---

# 📋 **TABLE OF CONTENTS**

1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Core Features & Modules](#core-features)
4. [Service Specifications](#service-specifications)
5. [Data Models & Database Schema](#data-models)
6. [API Endpoints](#api-endpoints)
7. [Workflows & Automation](#workflows)
8. [External Integrations](#integrations)
9. [AI/ML Components](#ai-ml)
10. [Configuration & Setup](#configuration)
11. [Monitoring & Analytics](#monitoring)
12. [Security & Compliance](#security)

---

# 🎯 **1. PROJECT OVERVIEW** {#project-overview}

## **1.1 Business Model**

### Revenue Streams
- **Lead Sales**: $125-200 per exclusive roofing lead
- **Contractor Subscriptions**: $500-5000/month (tiered)
- **Premium Features**: Enhanced analytics, priority leads
- **Target Revenue**: $500K+/month

### Value Proposition
- **For Contractors**: High-quality, exclusive leads with AI-verified roof conditions
- **For Homeowners**: Vetted contractors with competitive pricing
- **Competitive Advantage**: AI-powered roof analysis, automated discovery, multi-channel outreach

## **1.2 Technical Stack**

### Frontend
- **Framework**: Next.js 14
- **Port**: 3000
- **Features**: Lead marketplace, contractor dashboard, admin panel

### Backend
- **Framework**: FastAPI
- **Port**: 8000
- **Features**: Core API, authentication, business logic

### Infrastructure
- **Database**: PostgreSQL 15 with PostGIS
- **Cache**: Redis 7
- **Storage**: AWS S3 / Cloudflare R2
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (production)

### AI/ML Stack
- **Local LLM**: Ollama + Llama 3.2 3B
- **Web Scraping**: Crawl4AI, Playwright, Selenium
- **Image Processing**: OpenCV, Pillow, Real-ESRGAN
- **ML Models**: PyTorch, Ultralytics YOLOv8, scikit-learn

---

# 🏛️ **2. SYSTEM ARCHITECTURE** {#system-architecture}

## **2.1 Microservices Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    ROOFING PLATFORM ECOSYSTEM                    │
└─────────────────────────────────────────────────────────────────┘

EXISTING SERVICES:
├─ Frontend (Next.js) ──────────────────────────────────── Port 3000
└─ Backend API (FastAPI) ───────────────────────────────── Port 8000

NEW MICROSERVICES:
├─ Scraper Service ─────────────────────────────────────── Port 8001
│  └─ Data acquisition from public sources
│
├─ Image Processor ─────────────────────────────────────── Port 8002
│  └─ Image download, preprocessing, enhancement
│
├─ ML Inference ────────────────────────────────────────── Port 8003
│  └─ Roof analysis, damage detection, classification
│
├─ Enricher Service ────────────────────────────────────── Port 8004
│  └─ Contact finding, validation, data enrichment
│
├─ Contractor Acquisition ──────────────────────────────── Port 8005
│  └─ Contractor discovery, scoring, enrichment
│
├─ AI Calling ──────────────────────────────────────────── Port 8006
│  └─ Automated sales calls, transcription, analysis
│
├─ Outreach Orchestrator ───────────────────────────────── Port 8007
│  └─ Multi-channel campaigns, sequences, tracking
│
├─ Lead Generator ──────────────────────────────────────── Port 8008
│  └─ Scoring, clustering, pricing, packaging
│
└─ Master Orchestrator ─────────────────────────────────── Port 8009
   └─ Workflow coordination, scheduling, monitoring

SHARED INFRASTRUCTURE:
├─ PostgreSQL + PostGIS ────────────────────────────────── Port 5432
├─ Redis ───────────────────────────────────────────────── Port 6379
├─ Prometheus ──────────────────────────────────────────── Port 9090
└─ Grafana ─────────────────────────────────────────────── Port 3001
```

## **2.2 Data Flow Architecture**

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   SCRAPER    │────────▶│  ENRICHER    │────────▶│    LEAD      │
│   SERVICE    │         │   SERVICE    │         │  GENERATOR   │
└──────────────┘         └──────────────┘         └──────────────┘
      │                         │                         │
      │                         │                         │
      ▼                         ▼                         ▼
┌──────────────────────────────────────────────────────────────────┐
│                       PostgreSQL Database                         │
│  • Raw scraped data → Enriched data → Scored leads               │
└──────────────────────────────────────────────────────────────────┘
      ▲                         ▲                         ▲
      │                         │                         │
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    IMAGE     │         │      ML      │         │  CONTRACTOR  │
│  PROCESSOR   │         │  INFERENCE   │         │ ACQUISITION  │
└──────────────┘         └──────────────┘         └──────────────┘
```

---

# ⚙️ **3. CORE FEATURES & MODULES** {#core-features}

## **3.1 Data Acquisition System**

### **3.1.1 Permit Scraping**
- **Trigger Source**: Building permit databases
- **Target Data**:
  - Permit number
  - Property address (street, city, state, zip)
  - Issue date, completion date
  - Permit type (filter for roofing)
  - Work description
  - Contractor name and license
  - Estimated project value
  - Permit status

- **Scraping Methods**:
  - **Primary**: Crawl4AI + Local LLM (Llama 3.2 3B)
  - **Fallback 1**: Playwright (JavaScript rendering)
  - **Fallback 2**: Selenium (maximum compatibility)
  - **Fallback 3**: httpx + BeautifulSoup (static HTML)

- **Target Cities**: 75 cities across 3 tiers
  - **Tier 1** (15 cities): Premium markets (Austin, Dallas, Houston, Phoenix, Denver, etc.)
  - **Tier 2** (35 cities): Strong markets (Fort Worth, Colorado Springs, Tampa, etc.)
  - **Tier 3** (25 cities): Emerging markets (Boise, Fargo, Lubbock, etc.)

- **Scheduling**: Daily at 2:00 AM for all active cities
- **Lookback Period**: 30-90 days of permits
- **Success Rate Target**: 95%+ with fallbacks

### **3.1.2 Property Data Scraping**
- **Source**: County tax assessor websites
- **Target Data**:
  - Owner full name
  - Owner mailing address
  - Owner phone (if available)
  - Assessed property value
  - Year built
  - Square footage
  - Lot size (acres)
  - Bedrooms, bathrooms
  - Property type
  - Last sale date and price
  - Tax amount
  - Parcel ID/APN

- **Scraping Strategy**: Address-based search on county websites
- **AI Extraction**: Local LLM extracts structured data from HTML tables
- **Validation**: Address verification, geocoding to lat/lng
- **Cache**: 24-hour TTL in Redis

### **3.1.3 Imagery Acquisition**
- **Satellite Imagery**:
  - **Primary**: Google Maps Static API (18,000 free/month)
  - **Secondary**: Mapbox Static Images (50,000 free/month)
  - **Premium**: Nearmap (paid, ultra high-res)
  - Resolution: 640x640px minimum
  - Multiple zoom levels
  - Capture date tracking

- **Street View Imagery**:
  - Google Street View API
  - 4 angles per property (front, left, right, back)
  - Optimal positioning for roof visibility
  - Heading/bearing metadata

- **Storage**: AWS S3 or Cloudflare R2
- **Organization**: `/images/{property_id}/{type}/{angle}.jpg`

### **3.1.4 Weather Event Tracking**
- **Source**: NOAA Storm Events Database
- **Data Points**:
  - Event type (hail, wind, tornado, hurricane)
  - Event date and time
  - Location (lat/lng + radius)
  - Severity metrics (hail size, wind speed)
  - Affected area (radius in miles)

- **Matching**: PostGIS geographic queries
- **Radius**: 5-mile radius from property
- **Trigger Creation**: Automatic lead trigger for affected properties
- **Scheduling**: Daily at 3:00 AM

### **3.1.5 Neighborhood Activity**
- **Calculation**: PostGIS queries for nearby permits
- **Radius**: 0.25 miles (1320 feet)
- **Timeframes**: Last 30, 60, 90 days
- **Metrics**:
  - Count of roofing permits
  - Average project values
  - Trending contractors
  - Cluster density

- **Social Proof Score**: 5+ permits in 30 days = high urgency

## **3.2 Contact Acquisition System**

### **3.2.1 Email Finding (Multi-Tier Strategy)**

**FREE METHODS (Try First):**
1. **Public Records Check**
   - Query: property_records table
   - Success rate: 10-15%
   - Cost: $0.00

2. **Google Search Extraction**
   - Query: `"[owner name]" [city] [state] email`
   - Extract emails from search results
   - Validate format
   - Success rate: 20-30%
   - Cost: $0.00 (or $0.002 with SerpAPI)

3. **LinkedIn Profile Search**
   - Find owner's LinkedIn
   - Extract email if publicly visible
   - Success rate: 5-10%
   - Cost: $0.00

**PAID APIs (If Free Methods Fail):**
4. **Property Data APIs**
   - **Attom Data**: $0.10-0.25 per lookup
   - **Melissa Data**: $0.20 per lookup
   - Success rate: 40-50%

5. **Email Finder APIs**
   - **Hunter.io**: $0.01-0.05 per email
   - **Apollo.io**: $0.10 per lookup
   - **Snov.io**: $0.05 per email
   - Success rate: 30-40%

6. **Data Enrichment APIs**
   - **Clearbit**: $0.50-1.00 per lookup
   - **FullContact**: $0.30-0.60 per lookup
   - Success rate: 60-70%

**Email Verification (Always):**
- **ZeroBounce**: $0.001 per verification
- **NeverBounce**: $0.008 per verification
- Checks: Format, MX records, SMTP, disposable detection

**Target Metrics:**
- Email match rate: 85-90%
- Verified deliverable: 90%+
- Average cost per email: $0.30-0.50

### **3.2.2 Phone Number Finding**
- **Sources**: Property records, people search APIs, reverse lookup
- **Verification**: Phone type (mobile, landline, VOIP), carrier info
- **Do Not Call**: Check DNC registry before calling
- **Target Match Rate**: 70-80%

### **3.2.3 Address Validation & Geocoding**
- **Validation**: USPS address validation
- **Geocoding**: Mapbox or Google Geocoding API
- **Accuracy**: Street-level precision
- **PostGIS**: Store as geography type for spatial queries

## **3.3 Image Processing & Enhancement**

### **3.3.1 Preprocessing Pipeline**
1. **Format Standardization**
   - Convert all to JPEG
   - Resize to 1024x1024
   - Color space normalization

2. **Quality Enhancement**
   - Brightness/contrast adjustment
   - Sharpening filters
   - Noise reduction
   - HDR tone mapping

3. **Super-Resolution**
   - **Model**: Real-ESRGAN
   - **Upscaling**: 2x or 4x
   - **Purpose**: Enhance details for analysis
   - **Output**: High-res version for ML

4. **Damage-Specific Transformations**
   - **Missing shingles detection**: Edge enhancement
   - **Moss/algae detection**: Color channel isolation (green)
   - **Rust detection**: Red/brown color boost
   - **Curling detection**: Shadow enhancement
   - **Hail damage**: Contrast boosting

### **3.3.2 Image Storage Strategy**
- **Original**: `/images/{property_id}/original/`
- **Preprocessed**: `/images/{property_id}/preprocessed/`
- **Super-res**: `/images/{property_id}/super_res/`
- **Transformed**: `/images/{property_id}/transformed/{type}/`
- **Metadata**: JSON sidecar files with processing details

## **3.4 AI/ML Roof Analysis System**

### **3.4.1 Multi-Model Ensemble**

**Model 1: Roof Condition Classifier**
- **Architecture**: ResNet50 or EfficientNet
- **Input**: Preprocessed image (1024x1024)
- **Output**: Overall condition (5 classes)
  - Excellent (0-3 years old, no damage)
  - Good (4-10 years, minor wear)
  - Fair (11-15 years, moderate wear)
  - Poor (16-20 years, significant issues)
  - Critical (20+ years or severe damage)
- **Confidence Score**: 0-100%

**Model 2: Damage Detection (YOLO)**
- **Architecture**: YOLOv8 Medium
- **Input**: Super-res image
- **Output**: Bounding boxes + classes
  - Missing shingles
  - Curled/lifted shingles
  - Moss/algae growth
  - Rust stains
  - Hail damage (dents)
  - Cracked tiles
  - Ponding water (flat roofs)
  - Damaged flashing
  - Sagging areas
  - Tree damage
- **Per-class Confidence**: 0-100%

**Model 3: Semantic Segmentation**
- **Architecture**: U-Net or DeepLabV3+
- **Input**: Super-res image
- **Output**: Pixel-wise mask
  - Roof area vs. non-roof
  - Damage regions
  - Material type detection
- **Measurement**: Calculate roof square footage

### **3.4.2 Ensemble Decision Logic**
```python
Final Condition = weighted_average([
    classifier_prediction * 0.4,
    damage_detector_severity * 0.4,
    segmentation_analysis * 0.2
])

Confidence = min(
    classifier_confidence,
    average_detection_confidence,
    segmentation_confidence
)
```

### **3.4.3 Cost Estimation**
- **Inputs**: 
  - Roof square footage (from segmentation)
  - Damage types and severity
  - Local labor rates (by city)
  - Material costs (by roof type)

- **Outputs**:
  - Repair cost range (low-high)
  - Replacement cost range (low-high)
  - ROI for replacement vs. repair
  - Urgency score (0-100)

### **3.4.4 Validation Framework**

**Multi-Stage Validation:**
1. **Multi-Image Consistency** (Stage 1)
   - Analyze satellite + street view separately
   - Calculate agreement score
   - Threshold: 85%+ agreement required

2. **Cross-Source Validation** (Stage 2)
   - Check permit records (recent roof work?)
   - Check insurance claims (damage reports?)
   - Check property listings (roof mentioned?)
   - Validate against neighborhood trends

3. **Statistical Anomaly Detection** (Stage 3)
   - Compare to similar properties
   - Calculate z-score
   - Flag if >2 standard deviations

4. **Ground Truth Comparison** (Stage 4)
   - If available: Compare to known data
   - Human-validated samples
   - Historical accuracy tracking

5. **Confidence Threshold** (Stage 5)
   - Final confidence: Bayesian combination
   - Required: 95%+ confidence
   - Below threshold: Flag for human review

**Human-in-the-Loop:**
- Uncertain predictions (confidence <95%) → Human reviewer
- Dashboard for validation tasks
- Feedback loop improves model
- Track validator performance

## **3.5 Lead Scoring & Generation**

### **3.5.1 Quality Score Algorithm (0-100)**

**Factor 1: Property Value (0-20 points)**
```
>$500K:      20 points
$300-500K:   15 points
$200-300K:   10 points
$100-200K:    5 points
<$100K:       0 points
```

**Factor 2: Roof Age (0-20 points)**
```
>25 years:   20 points
20-25 years: 15 points
15-20 years: 10 points
10-15 years:  5 points
<10 years:    0 points
```

**Factor 3: Trigger Events (0-25 points)**
```
Recent hail damage:            +15 points
Wind damage:                   +10 points
Neighbor permits (5+ in 30d):  +10 points
Insurance claim filed:         +15 points
Multiple triggers:             Cumulative (max 25)
```

**Factor 4: AI Roof Condition (0-20 points)**
```
Critical:  20 points
Poor:      15 points
Fair:      10 points
Good:       5 points
Excellent:  0 points
```

**Factor 5: Contact Quality (0-10 points)**
```
Verified email + phone: 10 points
Verified email only:     7 points
Unverified email:        4 points
No contact info:         0 points
```

**Factor 6: Data Completeness (0-5 points)**
```
All fields complete:     5 points
Missing 1-2 fields:      3 points
Missing 3+ fields:       0 points
```

**Total Score**: Sum of all factors (0-100)

**Grade Mapping:**
```
90-100: Grade A (Excellent)
80-89:  Grade B (Very Good)
70-79:  Grade C (Good)
60-69:  Grade D (Fair)
<60:    Not Available
```

### **3.5.2 Dynamic Pricing**
```python
Base Price = $125

if score >= 90:
    price = $200
elif score >= 80:
    price = $175
elif score >= 70:
    price = $150
elif score >= 60:
    price = $125
else:
    price = None  # Not available for sale

# Adjustments
if urgent_trigger:  # Hail, storm damage
    price *= 1.2    # +20% urgency premium

if exclusive_territory:
    price *= 1.1    # +10% exclusivity premium

if multiple_contractors_interested:
    price *= 1.15   # +15% demand premium
```

### **3.5.3 Trigger Detection**

**Trigger Types:**
1. **Neighbor Permits** (Social Proof)
   - Threshold: 5+ roofing permits within 0.25 miles in last 30 days
   - Strength: 70-90 (based on count)

2. **Weather Event** (Damage)
   - Hail within 5 miles in last 90 days
   - Wind >60 mph
   - Tornado/hurricane in area
   - Strength: 80-100 (based on severity)

3. **Roof Age** (Lifecycle)
   - >20 years old
   - Strength: 50-70 (based on age)

4. **Insurance Claim** (Verified Damage)
   - Public claim record found
   - Strength: 90-100

5. **Property Sale** (New Owner)
   - Sold in last 12 months
   - Strength: 40-60

**Trigger Expiration:**
- Weather events: 180 days
- Neighbor permits: 90 days
- Other triggers: Based on type

### **3.5.4 Geographic Clustering**

**Cluster Creation:**
- Algorithm: DBSCAN or K-means
- Radius: 2 miles
- Min leads per cluster: 10
- Max leads per cluster: 100

**Cluster Assignment:**
1. Check existing clusters within 2 miles
2. Assign to nearest cluster
3. If no cluster found, create new cluster
4. Update cluster statistics

**Cluster Optimization:**
- Run weekly
- Merge small clusters (<10 leads)
- Split large clusters (>100 leads)
- Rebalance for even distribution

**Exclusive Territory Assignment:**
- Assign cluster to single contractor (optional)
- Premium pricing for exclusivity
- Performance tracking
- Auto-reassignment if contractor inactive

## **3.6 Contractor Acquisition System**

### **3.6.1 Contractor Discovery**

**Multi-Source Scraping:**

1. **Google Maps / Google Business**
   - Search: "roofing contractors in [city], [state]"
   - Extract: Name, address, phone, rating, review count, website
   - API: Google Places API or scraping
   - Target: 50-100 contractors per city

2. **Yelp**
   - Category: Roofing
   - Location: City, state
   - Extract: Name, rating, reviews, price range, services
   - API: Yelp Fusion API
   - Target: 30-50 contractors per city

3. **Better Business Bureau (BBB)**
   - Search: Roofing + location
   - Extract: Rating, accreditation status, complaints, years in business
   - Method: Web scraping (no API)
   - Target: 20-40 contractors per city

4. **State Licensing Boards**
   - Search: Active roofing licenses in state
   - Extract: License number, company name, expiration date, status
   - Method: Web scraping (varies by state)
   - Target: All licensed contractors in area

5. **HomeAdvisor / Angie's List**
   - Search: Roofing + city
   - Extract: Services, certifications, portfolio
   - Method: Web scraping
   - Target: 30-50 contractors per city

6. **LinkedIn Company Pages**
   - Find company profiles
   - Extract: Employee count, year founded, specialties
   - Method: LinkedIn API or scraping

**Deduplication:**
- Match by: Name similarity (fuzzy), phone number, address
- Merge data from multiple sources
- Keep highest quality data for each field

### **3.6.2 Contractor Enrichment**

**Website Scraping:**
- Find company website
- Extract:
  - Owner/contact person name
  - Email address(es)
  - Services offered
  - Certifications (GAF, Owens Corning, CertainTeed, etc.)
  - Years in business
  - Service areas
  - Portfolio/past projects
  - Team size
  - Insurance information

**Contact Finding:**
- Use same email finding strategies as property owners
- Priority: Business emails (more reliable than personal)
- Find owner's personal contact (LinkedIn, etc.)

**Social Media Profiles:**
- Facebook business page
- Instagram
- Twitter/X
- Activity level and engagement

### **3.6.3 Contractor Scoring**

**Fit Score (0-100):**

Factor 1: **Online Presence** (0-20 points)
```
Has website:               +5
Google rating 4.5+:        +5
50+ Google reviews:        +5
BBB accredited:            +5
```

Factor 2: **Business Size** (0-20 points)
```
10-50 employees:  20 points
5-10 employees:   15 points
1-5 employees:    10 points
Solo operator:     5 points
```

Factor 3: **Experience** (0-15 points)
```
10+ years:   15 points
5-10 years:  10 points
2-5 years:    5 points
<2 years:     0 points
```

Factor 4: **Location** (0-15 points)
```
In target city:       15 points
Within 25 miles:      10 points
Within 50 miles:       5 points
>50 miles away:        0 points
```

Factor 5: **Specialization** (0-15 points)
```
Residential roofing:           +5
Multiple roof types:           +5
Insurance restoration work:    +5
```

Factor 6: **Licensing & Certifications** (0-15 points)
```
Valid state license:      10 points
Manufacturer certs:       +5 (GAF Master Elite, etc.)
```

**Conversion Likelihood Score (0-100):**
```python
likelihood = 0

if has_website:
    likelihood += 30
if has_email:
    likelihood += 20
if active_social_media:
    likelihood += 15
if recently_reviewed:  # Reviews in last 30 days
    likelihood += 15
if moderate_size:  # Not too small, not too large
    likelihood += 20

return likelihood
```

**Lifetime Value (LTV) Estimate:**
```python
# Base LTV by business size
if employees >= 10:
    base_ltv = 5000  # $5K/month
elif employees >= 5:
    base_ltv = 2000  # $2K/month
else:
    base_ltv = 500   # $500/month

# Adjustments
if rating >= 4.5:
    base_ltv *= 1.3  # High quality = more volume

if urban_area:
    base_ltv *= 1.5  # Urban = more demand

# 12-month LTV
ltv_12m = base_ltv * 12

return ltv_12m
```

**Priority Score:**
```python
priority = (fit_score + conversion_likelihood) / 2
```

### **3.6.4 Multi-Channel Outreach**

**Channel 1: Email Campaign (Primary)**

7-Email Sequence over 14 days:
1. **Day 0 - Cold Introduction**
   - Subject: "Exclusive roofing leads in [City]"
   - Introduce platform
   - Mention specific value for their business
   - CTA: Learn more

2. **Day 2 - Value Proposition**
   - Subject: "How [Company] can get 50+ qualified leads/month"
   - Explain lead quality
   - Show example lead
   - CTA: See sample leads

3. **Day 4 - Case Study**
   - Subject: "Case study: [Similar Company] closes $2M from our leads"
   - Real contractor success story
   - ROI calculation
   - CTA: Book 15-min demo

4. **Day 7 - Social Proof**
   - Subject: "[X] contractors in [City] already using our platform"
   - Testimonials
   - Market demand data
   - CTA: Join them

5. **Day 9 - Limited Time Offer**
   - Subject: "First month 50% off - Limited spots in [City]"
   - Urgency (limited spots)
   - Special pricing
   - CTA: Claim your spot

6. **Day 11 - SMS Check-in** (if phone available)
   - Text: "Quick question about roofing leads in [City]..."
   - Link to schedule call

7. **Day 14 - Final Follow-up**
   - Subject: "Last chance: First month 50% off expires tonight"
   - Final urgency push
   - CTA: Sign up now

**Email Features:**
- Personalized with contractor name, company, city
- A/B testing on subject lines
- Track opens, clicks, replies
- Automatic unsubscribe handling
- CAN-SPAM compliant

**Channel 2: AI-Powered Phone Calls**

**Vapi.ai Integration:**
- Voice: Professional (11Labs voice)
- Personality: Friendly but professional, not pushy
- Goal: Book 15-minute demo call
- Script: Personalized per contractor

**Call Script Structure:**
```
1. Introduction (15 sec)
   - "Hi, is this [Name]?"
   - "I'm calling from [Company]..."
   - "Do you have a quick minute?"

2. Value Proposition (30 sec)
   - "We work with roofing contractors in [City]"
   - "Provide exclusive, pre-qualified leads"
   - "AI-verified roof conditions"

3. Social Proof (20 sec)
   - "We're working with [X] contractors in your area"
   - "Average lead-to-job conversion: 30%"
   - "Typical project value: $8K-15K"

4. Call to Action (15 sec)
   - "Can we schedule 15 minutes this week?"
   - "Tuesday afternoon or Thursday morning?"

5. Objection Handling (variable)
   - "Too expensive" → Emphasize ROI
   - "Not interested" → Ask what's working now
   - "Send info" → "Will do, but let's schedule 15 min..."
```

**Call Analysis:**
- Transcribe full conversation
- Extract with local LLM:
  - Sentiment (very positive to very negative)
  - Interest level (0-100)
  - Wants demo? (yes/no/when)
  - Objections raised
  - Questions asked
  - Next action recommendation

**Follow-up Actions:**
- If interested: Schedule demo automatically
- If callback requested: Schedule callback
- If not interested: Mark as disqualified
- If moderate interest: Send follow-up email

**Channel 3: SMS Follow-up**
- Send only if phone number available
- Send only after 2-3 email attempts
- Keep messages short (under 160 chars)
- Include link to schedule call
- Track delivery and response

**Channel 4: LinkedIn Outreach**
- Find decision maker on LinkedIn
- Send connection request
- Send message after connection
- Keep it casual and consultative

**Channel 5: Direct Mail** (High-value targets only)
- Send to contractors with LTV >$10K
- Professional postcard or letter
- Include unique promo code
- Track redemption

### **3.6.5 Outreach Tracking & Optimization**

**Metrics Per Contractor:**
- Total touchpoints
- Channels used
- Open rate, click rate, response rate
- Time to response
- Engagement score (0-100)
- Current stage in funnel

**Campaign Metrics:**
- Contractors targeted
- Emails sent/opened/clicked
- Calls made/answered/interested
- Meetings booked
- Signups generated
- Cost per acquisition
- ROI per campaign

**A/B Testing:**
- Subject lines
- Email content
- Call scripts
- SMS messages
- Send times
- Frequency

**Optimization:**
- Pause underperforming campaigns
- Double down on winners
- Adjust messaging based on objections
- Refine targeting criteria

### **3.6.6 Contractor Onboarding**

**Sign-up Flow:**
1. Choose subscription tier
2. Enter payment information
3. Complete profile
4. Select service areas
5. Set lead preferences
6. Review platform tutorial
7. Get first leads immediately

**Subscription Tiers:**

**Starter Tier** ($500/month)
- 10-15 leads per month
- Basic analytics
- Email support
- City-level exclusivity (shared)

**Professional Tier** ($2000/month)
- 40-50 leads per month
- Advanced analytics
- Phone support
- ZIP code exclusivity
- Priority lead delivery

**Enterprise Tier** ($5000/month)
- 100+ leads per month
- Custom analytics dashboard
- Dedicated account manager
- City-wide exclusivity (single contractor)
- API access
- White-label option

**Contract Terms:**
- Month-to-month (no long-term commitment)
- Cancel anytime
- Refund policy: Unused leads refunded
- Performance guarantee: 20%+ lead-to-job conversion or money back

## **3.7 Lead Delivery & Marketplace**

### **3.7.1 Contractor Dashboard**

**Key Features:**
- **Available Leads**: Browse leads in service area
- **Lead Details**: Full property info, roof analysis, owner contact
- **Lead Filters**: Score, price, location, urgency, roof type
- **Purchase History**: Past leads, conversion tracking
- **Analytics**: 
  - Conversion rate
  - ROI calculation
  - Lead quality ratings
  - Time to close
- **Notifications**: New leads in area, urgent leads

### **3.7.2 Lead Assignment Logic**

**Matching Criteria:**
1. **Geographic**: Within contractor's service area
2. **Availability**: Lead not already sold
3. **Tier Access**: Premium contractors get first access
4. **Exclusivity**: Respect exclusive territories
5. **Quality**: Match contractor's preferred score range

**Notification System:**
- Email: New lead available
- SMS: Urgent lead (hail damage, etc.)
- Push notification: Mobile app
- In-app: Dashboard notification

**Purchase Flow:**
1. Contractor views lead preview (limited info)
2. Decides to purchase
3. Payment processed
4. Full lead details revealed
5. Lead marked as sold (exclusive)
6. Owner contact information provided

### **3.7.3 Lead Follow-up Tracking**

**Contractor Reports Back:**
- Contact made? (yes/no/when)
- Appointment scheduled?
- Quote provided?
- Job won? (yes/no)
- Job value? ($)
- Close date?
- Feedback on lead quality (1-5 stars)

**Automated Tracking:**
- Email opens (did contractor email homeowner?)
- Call attempts (if using platform dialer)
- Response tracking

**Quality Assurance:**
- Low-rated leads investigated
- Refunds for truly bad leads
- Continuous improvement of scoring

## **3.8 Automation & Orchestration**

### **3.8.1 Daily Automated Jobs**

**2:00 AM - Permit Scraping**
```python
for city in active_cities:
    scrape_permits(city, days=30)
    process_new_permits()
```
- Duration: 1-2 hours
- Target: All Tier 1 and Tier 2 cities
- Frequency: Every day
- Success rate target: 95%+

**3:00 AM - Weather Events**
```python
scrape_noaa_storm_data()
match_events_to_properties(radius=5_miles)
create_triggers_for_affected_properties()
```
- Duration: 15-30 minutes
- Lookback: Last 7 days
- Frequency: Every day

**4:00 AM - Property Processing**
```python
new_permits = get_permits_from_last_24h()
for permit in new_permits:
    scrape_property_data(permit.address)
    download_images(permit.address)
    geocode_address(permit.address)
    store_in_database()
    trigger_enrichment()
```
- Duration: 2-4 hours
- Parallel processing: 10 properties at once
- Frequency: Every day

### **3.8.2 Hourly Automated Jobs**

**Enrichment Processing**
```python
properties = get_unenriched_properties(limit=100)
for property in properties:
    find_owner_email()
    find_owner_phone()
    verify_contacts()
    update_database()
```
- Batch size: 100 properties
- Frequency: Every hour
- Cost tracking: Log API costs

**ML Analysis**
```python
properties = get_properties_with_unanalyzed_images()
for property in properties:
    run_ml_inference(property.images)
    calculate_roof_score()
    estimate_repair_costs()
    store_analysis_results()
```
- Batch size: 50 properties
- Frequency: Every hour
- GPU usage monitoring

**Lead Generation**
```python
properties = get_enriched_unscored_properties()
for property in properties:
    calculate_quality_score()
    detect_triggers()
    assign_to_cluster()
    set_dynamic_price()
    mark_as_available()
    notify_contractors()
```
- Batch size: 100 properties
- Frequency: Every hour

**Outreach Execution**
```python
touchpoints = get_scheduled_touchpoints(due_now=True)
for touchpoint in touchpoints:
    if touchpoint.channel == 'email':
        send_email()
    elif touchpoint.channel == 'call':
        make_ai_call()
    elif touchpoint.channel == 'sms':
        send_sms()
    
    log_touchpoint()
    schedule_next_touchpoint()
```
- Check: Every 5 minutes
- Batch size: Unlimited
- Respect send-time preferences

### **3.8.3 Weekly Automated Jobs**

**Sunday 1:00 AM - City Expansion**
```python
if should_expand_to_new_city():
    next_city = get_next_priority_city()
    activate_city(next_city)
    
    # Scrape initial permits (90 days)
    scrape_permits(next_city, days=90)
    
    # Discover contractors
    discover_contractors(next_city)
    
    # Launch outreach campaign
    create_outreach_campaign(next_city)
    start_outreach()
```
- Expansion criteria: 
  - All Tier 1 cities active
  - Average 500+ leads/month per active city
  - Budget available for contractor acquisition
- Frequency: Weekly (if conditions met)

**Sunday 2:00 AM - Contractor Discovery** (New cities)
```python
new_cities = get_recently_activated_cities()
for city in new_cities:
    contractors = discover_contractors(city, max=200)
    for contractor in contractors:
        enrich_profile()
        calculate_scores()
        create_outreach_campaign()
```
- Duration: 2-4 hours per city
- Parallel: 1 city at a time

**Sunday 3:00 AM - Performance Reports**
```python
generate_weekly_report(
    scraping_stats,
    lead_generation_stats,
    contractor_acquisition_stats,
    revenue_metrics
)
send_to_admin_email()
```

### **3.8.4 Continuous Background Workers**

**Worker 1: Image Download Queue**
- Redis queue: `queue:images`
- Workers: 5 concurrent
- Pop from queue, download, upload to S3, update DB

**Worker 2: Enrichment Queue**
- Redis queue: `queue:enrichment`
- Workers: 10 concurrent
- Pop from queue, enrich, update DB, track costs

**Worker 3: ML Inference Queue**
- Redis queue: `queue:ml_inference`
- Workers: 2 concurrent (GPU limited)
- Pop from queue, run inference, store results

**Worker 4: Email Queue**
- Redis queue: `queue:emails`
- Workers: 5 concurrent
- Pop from queue, send email, track delivery

### **3.8.5 Event-Driven Workflows**

**Event: `permit.scraped`**
```python
on_permit_scraped(permit):
    create_base_lead(permit)
    emit('lead.created', lead_id)
```

**Event: `lead.created`**
```python
on_lead_created(lead_id):
    queue_image_download(lead_id)
    queue_property_scraping(lead_id)
    queue_enrichment(lead_id)
```

**Event: `enrichment.completed`**
```python
on_enrichment_completed(lead_id):
    if has_images(lead_id):
        queue_ml_inference(lead_id)
```

**Event: `ml_inference.completed`**
```python
on_ml_inference_completed(lead_id):
    queue_lead_scoring(lead_id)
```

**Event: `lead.scored`**
```python
on_lead_scored(lead_id):
    if score >= 60:
        mark_as_available(lead_id)
        notify_matching_contractors(lead_id)
```

**Event: `city.activated`**
```python
on_city_activated(city, state):
    queue_initial_permit_scrape(city, state, days=90)
    queue_contractor_discovery(city, state)
    emit('contractor_acquisition.start', city, state)
```

**Event: `contractor.discovered`**
```python
on_contractor_discovered(contractor_id):
    queue_enrichment(contractor_id)
    calculate_scores(contractor_id)
    create_outreach_campaign(contractor_id)
```

**Event: `contractor.signed_up`**
```python
on_contractor_signed_up(contractor_id):
    send_welcome_email()
    deliver_first_leads()
    schedule_onboarding_call()
```

---

# 🗄️ **4. DATA MODELS & DATABASE SCHEMA** {#data-models}

## **4.1 Core Tables**

### **4.1.1 verticals**
```sql
CREATE TABLE verticals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
```
**Purpose**: Service categories (Roofing, HVAC, Plumbing, etc.)

### **4.1.2 target_cities**
```sql
CREATE TABLE target_cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    tier INTEGER, -- 1, 2, or 3
    priority INTEGER, -- 1-100
    
    -- Demographics
    population INTEGER,
    median_home_value DECIMAL(12,2),
    avg_property_value DECIMAL(12,2),
    storm_risk_score INTEGER, -- 0-100
    contractor_density DECIMAL(10,4), -- per 1000 residents
    
    -- Scraping configuration
    permit_url TEXT,
    permit_search_strategy VARCHAR(50),
    permit_config JSONB,
    assessor_url TEXT,
    assessor_search_url_template TEXT,
    assessor_config JSONB,
    
    -- Status
    active BOOLEAN DEFAULT TRUE,
    first_scraped_at TIMESTAMP,
    last_scraped_at TIMESTAMP,
    total_permits_found INTEGER DEFAULT 0,
    total_properties_processed INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(city, state)
);
```
**Indexes:**
```sql
CREATE INDEX idx_target_cities_active ON target_cities(active);
CREATE INDEX idx_target_cities_tier ON target_cities(tier);
CREATE INDEX idx_target_cities_priority ON target_cities(priority DESC);
```

### **4.1.3 base_leads**
```sql
CREATE TABLE base_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical_id UUID REFERENCES verticals(id),
    
    -- Property location
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip VARCHAR(10),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    geom GEOGRAPHY(POINT, 4326),
    
    -- Property details
    property_value DECIMAL(12, 2),
    year_built INTEGER,
    sqft INTEGER,
    lot_size DECIMAL(10, 2),
    beds INTEGER,
    baths DECIMAL(3, 1),
    property_type VARCHAR(50),
    
    -- Owner information
    owner_name VARCHAR(255),
    owner_occupied BOOLEAN,
    owner_email VARCHAR(255),
    owner_email_confidence DECIMAL(5,2), -- 0-100
    owner_email_source VARCHAR(100),
    owner_email_verified BOOLEAN DEFAULT FALSE,
    owner_phone VARCHAR(50),
    owner_phone_verified BOOLEAN DEFAULT FALSE,
    email_acquisition_cost DECIMAL(10,4),
    
    -- Lead metadata
    quality_score INTEGER, -- 0-100
    price DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'available',
    -- available, reserved, sold, expired
    
    -- Timestamps
    available_until TIMESTAMP,
    reserved_at TIMESTAMP,
    sold_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(address, city, state)
);
```
**Indexes:**
```sql
CREATE INDEX idx_base_leads_location ON base_leads(city, state);
CREATE INDEX idx_base_leads_status ON base_leads(status);
CREATE INDEX idx_base_leads_quality ON base_leads(quality_score DESC);
CREATE INDEX idx_base_leads_geom ON base_leads USING GIST(geom);
CREATE INDEX idx_base_leads_owner_email ON base_leads(owner_email);
```

### **4.1.4 roofing_leads**
```sql
CREATE TABLE roofing_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_lead_id UUID REFERENCES base_leads(id) ON DELETE CASCADE,
    vertical_id UUID REFERENCES verticals(id),
    
    -- Roof details
    estimated_roof_age INTEGER,
    roof_type VARCHAR(50), -- shingle, tile, metal, flat, slate
    roof_sqft INTEGER,
    roof_pitch VARCHAR(50),
    last_roof_permit DATE,
    
    -- Trigger events
    neighbor_permits_30d INTEGER DEFAULT 0,
    neighbor_permits_60d INTEGER DEFAULT 0,
    neighbor_permits_90d INTEGER DEFAULT 0,
    hail_event_30d BOOLEAN DEFAULT FALSE,
    hail_event_90d BOOLEAN DEFAULT FALSE,
    wind_event_30d BOOLEAN DEFAULT FALSE,
    trigger_event VARCHAR(100),
    trigger_details JSONB,
    
    -- Imagery
    satellite_image_url TEXT,
    street_view_urls TEXT[],
    
    -- AI analysis
    ai_roof_analysis JSONB,
    ai_insights JSONB,
    damage_detected TEXT[],
    damage_severity JSONB, -- {damage_type: severity_score}
    repair_cost_estimate JSONB, -- {low: X, high: Y}
    replacement_cost_estimate JSONB,
    
    -- Metadata
    data_sources TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(base_lead_id)
);
```

### **4.1.5 roofing_permits**
```sql
CREATE TABLE roofing_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    permit_number VARCHAR(100) UNIQUE,
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    
    permit_type VARCHAR(100),
    work_description TEXT,
    estimated_value DECIMAL(10, 2),
    
    contractor_name VARCHAR(255),
    contractor_license VARCHAR(100),
    
    issue_date DATE,
    completion_date DATE,
    permit_status VARCHAR(50),
    
    -- Scraping metadata
    source VARCHAR(100),
    source_url TEXT,
    scraped_at TIMESTAMP DEFAULT NOW(),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_permits_location ON roofing_permits(city, state);
CREATE INDEX idx_permits_date ON roofing_permits(issue_date DESC);
CREATE INDEX idx_permits_address ON roofing_permits(address);
```

## **4.2 Image & Analysis Tables**

### **4.2.1 property_images**
```sql
CREATE TABLE property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_lead_id UUID REFERENCES base_leads(id) ON DELETE CASCADE,
    
    image_type VARCHAR(50), -- satellite, street_view, processed, super_res
    view_angle VARCHAR(50), -- front, left, right, rear, overhead
    
    -- Storage
    original_url TEXT,
    s3_url TEXT,
    s3_key TEXT,
    s3_bucket VARCHAR(100),
    
    -- Metadata
    capture_date DATE,
    image_width INTEGER,
    image_height INTEGER,
    file_size_bytes INTEGER,
    format VARCHAR(10), -- jpg, png
    
    -- Quality
    quality_score INTEGER, -- 0-100
    usable_for_analysis BOOLEAN DEFAULT TRUE,
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP,
    processing_config JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_property_images_lead ON property_images(base_lead_id);
CREATE INDEX idx_property_images_type ON property_images(image_type);
```

### **4.2.2 roof_analysis**
```sql
CREATE TABLE roof_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_lead_id UUID REFERENCES base_leads(id) ON DELETE CASCADE,
    
    -- Overall assessment
    overall_condition VARCHAR(50), -- excellent, good, fair, poor, critical
    confidence_score DECIMAL(5,2), -- 0-100
    
    -- Damage detection
    damage_detected BOOLEAN,
    damage_types TEXT[], -- Array of damage types
    damage_severity JSONB, -- {damage_type: severity_0_to_100}
    damage_locations JSONB, -- Bounding boxes {x, y, w, h}
    damage_areas_sqft JSONB, -- {damage_type: area}
    
    -- Measurements
    roof_sqft INTEGER,
    roof_pitch VARCHAR(50),
    roof_type VARCHAR(50),
    estimated_age INTEGER, -- years
    estimated_remaining_life INTEGER, -- years
    
    -- Cost estimates
    repair_cost_low DECIMAL(10,2),
    repair_cost_high DECIMAL(10,2),
    replacement_cost_low DECIMAL(10,2),
    replacement_cost_high DECIMAL(10,2),
    roi_for_replacement DECIMAL(5,2), -- Percentage
    
    -- Model information
    classifier_model VARCHAR(100),
    classifier_version VARCHAR(50),
    detector_model VARCHAR(100),
    detector_version VARCHAR(50),
    segmentor_model VARCHAR(100),
    segmentor_version VARCHAR(50),
    
    -- Validation
    validation_status VARCHAR(50), -- pending, approved, needs_review
    validation_confidence DECIMAL(5,2),
    human_validated BOOLEAN DEFAULT FALSE,
    human_validator_id UUID,
    validation_notes TEXT,
    validation_date TIMESTAMP,
    
    analyzed_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_roof_analysis_lead ON roof_analysis(base_lead_id);
CREATE INDEX idx_roof_analysis_condition ON roof_analysis(overall_condition);
CREATE INDEX idx_roof_analysis_confidence ON roof_analysis(confidence_score DESC);
```

## **4.3 Trigger & Event Tables**

### **4.3.1 weather_events**
```sql
CREATE TABLE weather_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    event_type VARCHAR(50), -- hail, wind, tornado, hurricane
    event_date DATE,
    event_time TIME,
    
    -- Location
    city VARCHAR(100),
    state VARCHAR(2),
    county VARCHAR(100),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    radius_miles DECIMAL(5,2),
    
    -- Severity
    severity VARCHAR(50), -- minor, moderate, severe, extreme
    hail_size_inches DECIMAL(3,2),
    wind_speed_mph INTEGER,
    tornado_rating VARCHAR(10), -- EF0-EF5
    
    -- Source
    source VARCHAR(100), -- NOAA, weather.gov, news
    source_url TEXT,
    external_id VARCHAR(255),
    
    -- Impact
    properties_affected_estimate INTEGER,
    insurance_claims_filed INTEGER,
    damage_estimate DECIMAL(12,2),
    
    created_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_weather_events_location ON weather_events(city, state);
CREATE INDEX idx_weather_events_date ON weather_events(event_date DESC);
CREATE INDEX idx_weather_events_type ON weather_events(event_type);
```

### **4.3.2 lead_triggers**
```sql
CREATE TABLE lead_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_lead_id UUID REFERENCES base_leads(id) ON DELETE CASCADE,
    
    trigger_type VARCHAR(50),
    -- neighbor_permits, weather_event, roof_age, damage_detected, 
    -- insurance_claim, property_sale
    
    trigger_date TIMESTAMP,
    trigger_strength INTEGER, -- 0-100 (urgency)
    
    -- Details
    trigger_details JSONB,
    -- Example for neighbor_permits:
    -- {"count": 8, "radius_miles": 0.25, "avg_value": 12000}
    
    -- Status
    active BOOLEAN DEFAULT TRUE,
    expired_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_lead_triggers_lead ON lead_triggers(base_lead_id);
CREATE INDEX idx_lead_triggers_type ON lead_triggers(trigger_type);
CREATE INDEX idx_lead_triggers_active ON lead_triggers(active) WHERE active = TRUE;
CREATE INDEX idx_lead_triggers_strength ON lead_triggers(trigger_strength DESC);
```

## **4.4 Lead Management Tables**

### **4.4.1 lead_clusters**
```sql
CREATE TABLE lead_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    cluster_name VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    
    -- Geographic center
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    radius_miles DECIMAL(5,2),
    
    -- Statistics
    lead_count INTEGER DEFAULT 0,
    avg_quality_score DECIMAL(5,2),
    total_value DECIMAL(12,2),
    leads_available INTEGER DEFAULT 0,
    leads_sold INTEGER DEFAULT 0,
    
    -- Assignment
    exclusive_contractor_id UUID REFERENCES contractors(id),
    assigned_at TIMESTAMP,
    exclusivity_expires_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_lead_clusters_location ON lead_clusters(city, state);
CREATE INDEX idx_lead_clusters_contractor ON lead_clusters(exclusive_contractor_id);
```

### **4.4.2 lead_assignments**
```sql
CREATE TABLE lead_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    base_lead_id UUID REFERENCES base_leads(id),
    contractor_id UUID REFERENCES contractors(id),
    
    assigned_at TIMESTAMP DEFAULT NOW(),
    price_paid DECIMAL(10,2),
    
    -- Interaction tracking
    viewed BOOLEAN DEFAULT FALSE,
    viewed_at TIMESTAMP,
    
    contacted BOOLEAN DEFAULT FALSE,
    contacted_at TIMESTAMP,
    contact_method VARCHAR(50), -- email, phone, in_person
    
    appointment_scheduled BOOLEAN DEFAULT FALSE,
    appointment_date TIMESTAMP,
    
    quote_provided BOOLEAN DEFAULT FALSE,
    quote_amount DECIMAL(10,2),
    quote_date TIMESTAMP,
    
    converted BOOLEAN DEFAULT FALSE,
    converted_at TIMESTAMP,
    job_value DECIMAL(10,2),
    
    -- Feedback
    contractor_rating INTEGER, -- 1-5 stars
    contractor_feedback TEXT,
    lead_quality_rating INTEGER, -- 1-5 stars
    
    created_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_lead_assignments_lead ON lead_assignments(base_lead_id);
CREATE INDEX idx_lead_assignments_contractor ON lead_assignments(contractor_id);
CREATE INDEX idx_lead_assignments_converted ON lead_assignments(converted);
```

## **4.5 Contractor Tables**

### **4.5.1 contractors**
```sql
CREATE TABLE contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic information
    company_name VARCHAR(255) NOT NULL,
    owner_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(500),
    
    -- Location
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    service_areas JSONB, -- [{city, state, radius_miles}]
    
    -- Business details
    license_number VARCHAR(100),
    license_state VARCHAR(2),
    license_status VARCHAR(50),
    license_expiration DATE,
    years_in_business INTEGER,
    employee_count_range VARCHAR(50), -- "1-5", "5-10", "10-50", etc.
    annual_revenue_range VARCHAR(50),
    
    -- Services & specialties
    services_offered TEXT[],
    roof_types TEXT[], -- residential, commercial, industrial
    certifications TEXT[], -- GAF Master Elite, etc.
    insurance_types TEXT[], -- general liability, workers comp
    
    -- Online presence
    google_rating DECIMAL(3,2),
    google_review_count INTEGER,
    google_place_id VARCHAR(255),
    yelp_rating DECIMAL(3,2),
    yelp_review_count INTEGER,
    yelp_business_id VARCHAR(255),
    bbb_rating VARCHAR(5), -- A+, A, B, etc.
    bbb_accredited BOOLEAN,
    social_media JSONB, -- {facebook, instagram, linkedin, etc.}
    
    -- Scoring
    fit_score INTEGER, -- 0-100
    conversion_likelihood INTEGER, -- 0-100
    ltv_estimate DECIMAL(10,2),
    priority_score DECIMAL(5,2),
    
    -- Acquisition status
    acquisition_status VARCHAR(50) DEFAULT 'discovered',
    -- discovered, contacted, interested, demo_scheduled, 
    -- negotiating, onboarded, active, churned
    
    current_stage VARCHAR(50),
    
    -- Engagement
    first_contact_date TIMESTAMP,
    last_contact_date TIMESTAMP,
    total_touchpoints INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2), -- 0-100
    
    -- Subscription
    signed_up_at TIMESTAMP,
    subscription_tier VARCHAR(50), -- starter, professional, enterprise
    monthly_fee DECIMAL(10,2),
    leads_per_month INTEGER,
    contract_start_date DATE,
    contract_end_date DATE,
    auto_renew BOOLEAN DEFAULT TRUE,
    
    -- Performance (post-signup)
    total_leads_purchased INTEGER DEFAULT 0,
    total_leads_contacted INTEGER DEFAULT 0,
    total_leads_converted INTEGER DEFAULT 0,
    total_revenue_generated DECIMAL(12,2) DEFAULT 0,
    avg_lead_quality_rating DECIMAL(3,2),
    conversion_rate DECIMAL(5,2), -- Percentage
    avg_time_to_contact_hours DECIMAL(6,2),
    
    -- Discovery metadata
    source VARCHAR(100), -- google_maps, yelp, bbb, license_board
    discovered_at TIMESTAMP DEFAULT NOW(),
    
    -- Additional
    notes TEXT,
    custom_fields JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_contractors_city_state ON contractors(city, state);
CREATE INDEX idx_contractors_status ON contractors(acquisition_status);
CREATE INDEX idx_contractors_priority ON contractors(priority_score DESC);
CREATE INDEX idx_contractors_email ON contractors(email);
CREATE INDEX idx_contractors_tier ON contractors(subscription_tier);
```

### **4.5.2 outreach_campaigns**
```sql
CREATE TABLE outreach_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50), -- cold_outreach, nurture, reactivation, upsell
    
    -- Targeting
    target_city VARCHAR(100),
    target_state VARCHAR(2),
    target_criteria JSONB, -- Contractor filtering criteria
    
    -- Configuration
    channels TEXT[], -- email, phone, sms, linkedin
    sequence_steps JSONB, -- Array of touchpoint definitions
    
    -- Status
    status VARCHAR(50) DEFAULT 'draft',
    -- draft, active, paused, completed
    
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Performance metrics
    contractors_targeted INTEGER DEFAULT 0,
    
    emails_sent INTEGER DEFAULT 0,
    emails_delivered INTEGER DEFAULT 0,
    emails_opened INTEGER DEFAULT 0,
    emails_clicked INTEGER DEFAULT 0,
    emails_replied INTEGER DEFAULT 0,
    
    calls_made INTEGER DEFAULT 0,
    calls_answered INTEGER DEFAULT 0,
    calls_interested INTEGER DEFAULT 0,
    
    sms_sent INTEGER DEFAULT 0,
    sms_delivered INTEGER DEFAULT 0,
    sms_replied INTEGER DEFAULT 0,
    
    meetings_booked INTEGER DEFAULT 0,
    signups_generated INTEGER DEFAULT 0,
    
    -- ROI
    total_cost DECIMAL(10,2) DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    roi DECIMAL(10,2), -- ROI percentage
    cost_per_acquisition DECIMAL(10,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### **4.5.3 outreach_touchpoints**
```sql
CREATE TABLE outreach_touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    contractor_id UUID REFERENCES contractors(id),
    campaign_id UUID REFERENCES outreach_campaigns(id),
    
    -- Touchpoint details
    channel VARCHAR(50), -- email, call, sms, linkedin
    touchpoint_type VARCHAR(50), -- cold_email, follow_up, demo_call
    sequence_step INTEGER,
    
    -- Content
    subject TEXT,
    message TEXT,
    template_used VARCHAR(100),
    
    -- Status
    status VARCHAR(50), -- scheduled, sent, delivered, opened, clicked, replied, failed
    
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    replied_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Response tracking
    contractor_responded BOOLEAN DEFAULT FALSE,
    response_text TEXT,
    response_sentiment VARCHAR(20), -- positive, neutral, negative
    
    -- AI analysis (for calls)
    ai_next_action TEXT,
    ai_sentiment_analysis JSONB,
    ai_insights JSONB,
    
    -- Metadata
    external_id VARCHAR(255), -- Email provider message ID, call ID, etc.
    cost DECIMAL(10,4),
    metadata JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_touchpoints_contractor ON outreach_touchpoints(contractor_id);
CREATE INDEX idx_touchpoints_campaign ON outreach_touchpoints(campaign_id);
CREATE INDEX idx_touchpoints_scheduled ON outreach_touchpoints(scheduled_for) 
    WHERE status = 'scheduled';
```

### **4.5.4 ai_call_logs**
```sql
CREATE TABLE ai_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    contractor_id UUID REFERENCES contractors(id),
    campaign_id UUID REFERENCES outreach_campaigns(id),
    touchpoint_id UUID REFERENCES outreach_touchpoints(id),
    
    -- Call details
    call_provider VARCHAR(50), -- vapi, bland_ai
    external_call_id VARCHAR(255),
    phone_number VARCHAR(50),
    
    -- Call outcome
    status VARCHAR(50),
    -- initiated, ringing, answered, completed, failed, 
    -- no_answer, voicemail, busy
    
    duration_seconds INTEGER,
    
    -- Transcript
    full_transcript TEXT,
    summary TEXT,
    key_points TEXT[],
    
    -- AI analysis
    sentiment VARCHAR(50), -- very_positive, positive, neutral, negative, very_negative
    interest_level INTEGER, -- 0-100
    objections_raised TEXT[],
    questions_asked TEXT[],
    next_action VARCHAR(255),
    probability_to_convert INTEGER, -- 0-100
    
    -- Decision outcomes
    wants_demo BOOLEAN DEFAULT FALSE,
    demo_scheduled_for TIMESTAMP,
    wants_callback BOOLEAN DEFAULT FALSE,
    callback_time TIMESTAMP,
    not_interested BOOLEAN DEFAULT FALSE,
    not_interested_reason TEXT,
    
    -- Recording
    recording_url TEXT,
    
    -- Metadata
    call_metadata JSONB,
    cost DECIMAL(10,4),
    
    created_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_call_logs_contractor ON ai_call_logs(contractor_id);
CREATE INDEX idx_call_logs_status ON ai_call_logs(status);
CREATE INDEX idx_call_logs_interest ON ai_call_logs(interest_level DESC);
```

### **4.5.5 demo_meetings**
```sql
CREATE TABLE demo_meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    contractor_id UUID REFERENCES contractors(id),
    
    -- Meeting details
    scheduled_at TIMESTAMP,
    duration_minutes INTEGER DEFAULT 30,
    meeting_url TEXT, -- Zoom, Google Meet, etc.
    meeting_provider VARCHAR(50),
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled',
    -- scheduled, confirmed, completed, no_show, cancelled, rescheduled
    
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMP,
    
    -- Outcome
    attended BOOLEAN,
    outcome VARCHAR(50), -- signed_up, needs_time, not_interested, follow_up
    follow_up_date TIMESTAMP,
    follow_up_notes TEXT,
    
    -- Details
    demo_notes TEXT,
    contractor_questions TEXT[],
    objections TEXT[],
    interest_level INTEGER, -- 0-100
    
    -- Recording
    recording_url TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## **4.6 Job Tracking Tables**

### **4.6.1 scraping_jobs**
```sql
CREATE TABLE scraping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    job_type VARCHAR(50), -- permit, property, image, contractor, weather
    city VARCHAR(100),
    state VARCHAR(2),
    
    -- Configuration
    config JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, running, completed, failed, cancelled
    
    -- Execution
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Progress
    total_items INTEGER DEFAULT 0,
    processed_items INTEGER DEFAULT 0,
    succeeded_items INTEGER DEFAULT 0,
    failed_items INTEGER DEFAULT 0,
    
    -- Results
    results JSONB,
    
    -- Error tracking
    error_message TEXT,
    error_stack TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    
    -- Metadata
    triggered_by VARCHAR(100), -- scheduler, manual, api, event
    parent_job_id UUID REFERENCES scraping_jobs(id),
    
    created_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX idx_scraping_jobs_city ON scraping_jobs(city, state);
CREATE INDEX idx_scraping_jobs_type ON scraping_jobs(job_type);
CREATE INDEX idx_scraping_jobs_created ON scraping_jobs(created_at DESC);
```

### **4.6.2 enrichment_jobs**
```sql
CREATE TABLE enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    base_lead_id UUID REFERENCES base_leads(id),
    
    enrichment_type VARCHAR(50), -- email, phone, property, validation, all
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    -- pending, running, completed, failed
    
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Results
    data_found BOOLEAN,
    confidence_score DECIMAL(5,2),
    
    -- Cost tracking
    cost DECIMAL(10,4),
    api_calls_made INTEGER DEFAULT 0,
    
    -- Sources
    sources_tried TEXT[],
    successful_source VARCHAR(100),
    
    -- Data
    enrichment_data JSONB,
    
    -- Error
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **4.6.3 ml_inference_jobs**
```sql
CREATE TABLE ml_inference_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    base_lead_id UUID REFERENCES base_leads(id),
    property_image_id UUID REFERENCES property_images(id),
    
    -- Job details
    model_type VARCHAR(50), -- classifier, detector, segmentor
    model_name VARCHAR(100),
    model_version VARCHAR(50),
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Resources
    gpu_used BOOLEAN,
    gpu_id INTEGER,
    memory_used_mb INTEGER,
    
    -- Results
    inference_results JSONB,
    confidence_score DECIMAL(5,2),
    
    -- Error
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

## **4.7 System Tables**

### **4.7.1 system_events**
```sql
CREATE TABLE system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    event_type VARCHAR(100),
    event_name VARCHAR(255),
    
    -- Context
    service VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    
    -- Data
    event_data JSONB,
    
    -- Severity
    severity VARCHAR(20), -- debug, info, warning, error, critical
    
    created_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_system_events_type ON system_events(event_type);
CREATE INDEX idx_system_events_created ON system_events(created_at DESC);
CREATE INDEX idx_system_events_severity ON system_events(severity);
```

### **4.7.2 api_usage_logs**
```sql
CREATE TABLE api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- API details
    api_provider VARCHAR(100), -- attom, hunter, zerobounce, etc.
    api_endpoint VARCHAR(255),
    
    -- Request
    request_method VARCHAR(10),
    request_params JSONB,
    
    -- Response
    response_status INTEGER,
    response_time_ms INTEGER,
    response_body JSONB,
    
    -- Cost
    cost DECIMAL(10,6),
    
    -- Context
    service VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    
    -- Success/failure
    success BOOLEAN,
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **4.7.3 scheduled_touchpoints**
```sql
CREATE TABLE scheduled_touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    contractor_id UUID REFERENCES contractors(id),
    campaign_id UUID REFERENCES outreach_campaigns(id),
    
    -- Touchpoint configuration
    channel VARCHAR(50), -- email, call, sms
    template VARCHAR(100),
    sequence_step INTEGER,
    
    -- Scheduling
    scheduled_for TIMESTAMP NOT NULL,
    priority INTEGER DEFAULT 50,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled',
    -- scheduled, processing, sent, failed, cancelled
    
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    
    -- Result
    touchpoint_id UUID REFERENCES outreach_touchpoints(id),
    
    created_at TIMESTAMP DEFAULT NOW()
);
```
**Indexes:**
```sql
CREATE INDEX idx_scheduled_touchpoints_due ON scheduled_touchpoints(scheduled_for) 
    WHERE status = 'scheduled';
CREATE INDEX idx_scheduled_touchpoints_contractor ON scheduled_touchpoints(contractor_id);
```

---

# 🔌 **5. API ENDPOINTS** {#api-endpoints}

## **5.1 Existing Backend API (Port 8000)**

### **Authentication**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh token

### **Contractors** (Existing - Enhance)
- `GET /api/contractors` - List contractors
- `POST /api/contractors` - Create contractor
- `GET /api/contractors/{id}` - Get contractor
- `PATCH /api/contractors/{id}` - Update contractor
- `DELETE /api/contractors/{id}` - Delete contractor

### **Leads** (Existing - Enhance)
- `GET /api/leads` - List available leads
- `GET /api/leads/{id}` - Get lead details
- `POST /api/leads/{id}/purchase` - Purchase lead
- `GET /api/leads/my-leads` - Contractor's purchased leads

## **5.2 Scraper Service (Port 8001)**

### **Health & Status**
- `GET /` - Service info
- `GET /health` - Health check

### **Manual Scraping**
- `POST /scrape/permits` - Scrape permits for city
  ```json
  {
    "city": "Austin",
    "state": "TX",
    "days": 30
  }
  ```

- `POST /scrape/property` - Scrape single property
  ```json
  {
    "address": "123 Main St",
    "city": "Austin",
    "state": "TX"
  }
  ```

- `POST /scrape/contractors` - Scrape contractors in city
  ```json
  {
    "city": "Austin",
    "state": "TX",
    "max_results": 200
  }
  ```

- `POST /scrape/weather` - Scrape weather events
  ```json
  {
    "city": "Austin",
    "state": "TX",
    "days": 7
  }
  ```

### **Job Management**
- `GET /jobs` - List all jobs
- `GET /jobs/{job_id}` - Get job details
- `POST /jobs/{job_id}/retry` - Retry failed job
- `POST /jobs/{job_id}/cancel` - Cancel running job

### **Scheduled Jobs**
- `GET /jobs/scheduled` - List scheduled jobs
- `POST /jobs/{job_id}/trigger` - Manually trigger scheduled job

## **5.3 Image Processor (Port 8002)**

### **Image Acquisition**
- `POST /images/satellite` - Download satellite image
  ```json
  {
    "property_id": "uuid",
    "lat": 30.2672,
    "lng": -97.7431
  }
  ```

- `POST /images/streetview` - Download street view images
  ```json
  {
    "property_id": "uuid",
    "lat": 30.2672,
    "lng": -97.7431,
    "angles": ["front", "left", "right", "back"]
  }
  ```

### **Image Processing**
- `POST /images/preprocess` - Preprocess images
  ```json
  {
    "property_id": "uuid"
  }
  ```

- `POST /images/enhance` - Super-resolution enhancement
  ```json
  {
    "image_id": "uuid",
    "scale": 4
  }
  ```

- `POST /images/transform` - Apply damage-specific transformations
  ```json
  {
    "image_id": "uuid",
    "transformations": ["missing_shingles", "moss", "rust"]
  }
  ```

### **Batch Operations**
- `POST /images/batch/download` - Batch image download
- `POST /images/batch/process` - Batch processing

## **5.4 ML Inference (Port 8003)**

### **Roof Analysis**
- `POST /analyze/property` - Full property analysis
  ```json
  {
    "property_id": "uuid"
  }
  ```

- `POST /analyze/image` - Single image analysis
  ```json
  {
    "image_id": "uuid",
    "models": ["classifier", "detector", "segmentor"]
  }
  ```

### **Model Management**
- `GET /models` - List available models
- `GET /models/{model_id}` - Get model info
- `POST /models/{model_id}/reload` - Reload model

### **Validation**
- `POST /validate/prediction` - Validate ML prediction
  ```json
  {
    "property_id": "uuid",
    "prediction": {...}
  }
  ```

- `GET /validation/pending` - Get predictions needing review
- `POST /validation/{id}/approve` - Approve prediction
- `POST /validation/{id}/reject` - Reject prediction

## **5.5 Enrichment Service (Port 8004)**

### **Contact Finding**
- `POST /enrich/email` - Find owner email
  ```json
  {
    "owner_name": "John Smith",
    "address": "123 Main St",
    "city": "Austin",
    "state": "TX"
  }
  ```

- `POST /enrich/phone` - Find owner phone
- `POST /enrich/property` - Enrich property data
- `POST /enrich/all` - Full enrichment

### **Verification**
- `POST /verify/email` - Verify email deliverability
  ```json
  {
    "email": "john@example.com"
  }
  ```

- `POST /verify/phone` - Verify phone number
- `POST /geocode` - Geocode address

### **Batch Operations**
- `POST /enrich/batch` - Batch enrichment
  ```json
  {
    "property_ids": ["uuid1", "uuid2", ...]
  }
  ```

## **5.6 Contractor Acquisition (Port 8005)**

### **Discovery**
- `POST /discover/city` - Discover contractors in city
  ```json
  {
    "city": "Austin",
    "state": "TX",
    "max_results": 200
  }
  ```

- `GET /discover/sources` - Get available discovery sources

### **Enrichment**
- `POST /contractors/{id}/enrich` - Enrich contractor profile
- `POST /contractors/{id}/score` - Calculate scores

### **Campaign Management**
- `POST /campaigns` - Create outreach campaign
  ```json
  {
    "name": "Austin Contractor Acquisition",
    "city": "Austin",
    "state": "TX",
    "channels": ["email", "call", "sms"],
    "target_criteria": {...}
  }
  ```

- `GET /campaigns` - List campaigns
- `GET /campaigns/{id}` - Get campaign details
- `POST /campaigns/{id}/start` - Start campaign
- `POST /campaigns/{id}/pause` - Pause campaign
- `GET /campaigns/{id}/stats` - Get campaign statistics

### **Contractor Management**
- `GET /contractors` - List all contractors
- `GET /contractors/{id}` - Get contractor details
- `PATCH /contractors/{id}` - Update contractor
- `GET /contractors/{id}/touchpoints` - Get touchpoint history

## **5.7 AI Calling (Port 8006)**

### **Call Management**
- `POST /calls/make` - Make AI call
  ```json
  {
    "contractor_id": "uuid",
    "phone_number": "+15125551234",
    "script_template": "cold_outreach"
  }
  ```

- `GET /calls` - List all calls
- `GET /calls/{id}` - Get call details
- `GET /calls/{id}/transcript` - Get transcript
- `GET /calls/{id}/recording` - Get recording URL

### **Call Analysis**
- `POST /calls/{id}/analyze` - Analyze call
- `GET /calls/pending-followup` - Get calls needing follow-up

## **5.8 Outreach Orchestrator (Port 8007)**

### **Touchpoint Execution**
- `POST /touchpoints/execute` - Execute touchpoint
- `GET /touchpoints/scheduled` - Get scheduled touchpoints
- `POST /touchpoints/{id}/cancel` - Cancel touchpoint

### **Sequence Management**
- `POST /sequences` - Create sequence
- `GET /sequences/{id}` - Get sequence details
- `POST /sequences/{id}/enroll` - Enroll contractor
- `POST /sequences/{id}/stop` - Stop contractor sequence

### **Performance Tracking**
- `GET /campaigns/{id}/performance` - Campaign performance
- `GET /contractors/{id}/engagement` - Contractor engagement

## **5.9 Lead Generator (Port 8008)**

### **Lead Scoring**
- `POST /score/property` - Score single property
- `POST /score/batch` - Batch scoring

### **Trigger Detection**
- `POST /triggers/detect` - Detect triggers for property
- `POST /triggers/batch` - Batch trigger detection

### **Clustering**
- `POST /clusters/assign` - Assign property to cluster
- `POST /clusters/optimize` - Optimize clusters
- `GET /clusters` - List all clusters
- `GET /clusters/{id}` - Get cluster details

### **Lead Generation**
- `POST /generate/leads` - Generate leads from properties
- `POST /leads/{id}/publish` - Publish lead for sale

## **5.10 Master Orchestrator (Port 8009)**

### **System Control**
- `GET /` - System status
- `GET /health` - Overall health
- `GET /metrics` - System metrics

### **Workflow Management**
- `POST /workflows/property` - Trigger property workflow
- `POST /workflows/city` - Trigger city activation workflow
- `GET /workflows` - List active workflows
- `GET /workflows/{id}` - Get workflow status

### **City Management**
- `GET /cities` - List all cities
- `GET /cities/{city}/{state}` - Get city details
- `POST /cities/{city}/{state}/activate` - Activate city
- `POST /cities/{city}/{state}/deactivate` - Deactivate city
- `GET /cities/{city}/{state}/progress` - Get city progress

### **Job Scheduling**
- `GET /jobs/scheduled` - List scheduled jobs
- `POST /jobs/{job_id}/trigger` - Trigger job manually
- `POST /jobs/{job_id}/pause` - Pause job
- `POST /jobs/{job_id}/resume` - Resume job

### **System Configuration**
- `GET /config` - Get system config
- `PATCH /config` - Update config
- `GET /config/features` - Get feature flags
- `PATCH /config/features` - Update feature flags

---

# 🔄 **6. WORKFLOWS & AUTOMATION** {#workflows}

## **6.1 Property Processing Workflow**

```
┌───────────────────────────────────────────────────────────────┐
│             NEW PERMIT DISCOVERED WORKFLOW                     │
└───────────────────────────────────────────────────────────────┘

1. PERMIT SCRAPED
   ↓
2. CREATE BASE LEAD
   - Parse address
   - Create database entry
   - Set status: 'processing'
   ↓
3. PARALLEL EXECUTION:
   ├─ SCRAPE PROPERTY DATA
   │  - County assessor lookup
   │  - Extract owner info
   │  - Extract property details
   │  - Geocode address
   │
   ├─ DOWNLOAD IMAGERY
   │  - Satellite image (Google/Mapbox)
   │  - Street view (4 angles)
   │  - Upload to S3
   │  - Save metadata
   │
   └─ ENRICH CONTACT INFO
      - Find owner email
      - Find owner phone
      - Verify email
      - Update confidence scores
   
   ↓
4. WAIT FOR COMPLETION (all parallel tasks done)
   ↓
5. IMAGE PROCESSING
   - Preprocess images
   - Super-resolution
   - Damage transformations
   ↓
6. ML INFERENCE
   - Classification
   - Detection
   - Segmentation
   - Ensemble decision
   ↓
7. VALIDATION
   - Multi-stage validation
   - Confidence calculation
   - If <95%: Flag for human review
   - If ≥95%: Continue
   ↓
8. TRIGGER DETECTION
   - Check neighbor permits
   - Check weather events
   - Check roof age
   - Calculate urgency
   ↓
9. LEAD SCORING
   - Calculate quality score (0-100)
   - Determine grade (A-F)
   - Set dynamic price
   ↓
10. CLUSTERING
    - Assign to geographic cluster
    - Update cluster stats
    ↓
11. PUBLISH LEAD
    - Set status: 'available'
    - Notify matching contractors
    - Add to marketplace
    ↓
12. COMPLETE ✅

Timeline: ~30-60 minutes per property
Parallel tasks: ~15 minutes
Sequential tasks: ~15-45 minutes
```

## **6.2 City Activation Workflow**

```
┌───────────────────────────────────────────────────────────────┐
│               NEW CITY ACTIVATION WORKFLOW                     │
└───────────────────────────────────────────────────────────────┘

TRIGGER: Manual activation OR automatic expansion

1. ACTIVATE CITY
   - Update target_cities table
   - Set active = TRUE
   - Log activation event
   ↓
2. INITIAL PERMIT SCRAPE (90 days)
   - Scrape last 90 days of permits
   - Filter for roofing permits only
   - Store in database
   ↓
3. PROCESS ALL PERMITS
   - Parallel processing (10 at a time)
   - Property data scraping
   - Image download
   - Contact enrichment
   - ML analysis
   - Lead scoring
   
   Duration: 2-6 hours for 500-1000 properties
   ↓
4. CONTRACTOR DISCOVERY
   - Scrape Google Maps (50-100 contractors)
   - Scrape Yelp (30-50 contractors)
   - Scrape BBB (20-40 contractors)
   - Scrape state license board (all licensed)
   - Deduplicate
   - Store in database
   
   Duration: 1-2 hours
   ↓
5. CONTRACTOR ENRICHMENT
   - Find contact information
   - Scrape websites
   - Calculate scores
   - Prioritize targets
   
   Duration: 2-4 hours for 200 contractors
   ↓
6. CREATE OUTREACH CAMPAIGN
   - Set up 7-email sequence
   - Configure AI call scripts
   - Set SMS templates
   - Define targeting criteria
   ↓
7. LAUNCH OUTREACH
   - Send first batch of emails (Day 0)
   - Schedule follow-ups (Days 2, 4, 7, 9, 11, 14)
   - Make AI calls (starting Day 2)
   - Track responses
   ↓
8. MONITOR & OPTIMIZE
   - Track signup rate
   - Adjust messaging
   - Identify high-performers
   - Scale what works
   ↓
9. COMPLETE ✅
   
Timeline: 5-10 days to full activation
- Day 0: Data collection (4-8 hours)
- Days 0-14: Contractor outreach
- Day 7+: First signups expected
- Day 30: City fully operational
```

## **6.3 Contractor Acquisition Workflow**

```
┌───────────────────────────────────────────────────────────────┐
│            CONTRACTOR ACQUISITION WORKFLOW                     │
└───────────────────────────────────────────────────────────────┘

1. CONTRACTOR DISCOVERED
   - Source: Google Maps, Yelp, BBB, License Board
   - Store basic info
   - Set status: 'discovered'
   ↓
2. ENRICHMENT
   - Find email
   - Find phone
   - Scrape website
   - Find owner name
   - Get certifications
   ↓
3. SCORING
   - Calculate fit score (0-100)
   - Calculate conversion likelihood (0-100)
   - Estimate LTV
   - Set priority
   ↓
4. CAMPAIGN ASSIGNMENT
   - Assign to city campaign
   - Enroll in 7-email sequence
   - Schedule touchpoints
   ↓
5. TOUCHPOINT EXECUTION
   Day 0: Email #1 - Cold intro
   Day 2: Email #2 - Value prop + AI Call
   Day 4: Email #3 - Case study
   Day 7: Email #4 - Social proof + AI Call
   Day 9: Email #5 - Limited offer
   Day 11: SMS - Quick check-in
   Day 14: Email #6 - Final push
   
   ↓
6. RESPONSE HANDLING
   
   IF interested:
   - Book demo automatically
   - Send calendar invite
   - Send preparation materials
   
   IF callback requested:
   - Schedule callback
   - Update CRM
   
   IF not interested:
   - Mark as disqualified
   - Remove from campaign
   
   IF no response after 14 days:
   - Move to long-term nurture
   - Reduce frequency
   
   ↓
7. DEMO MEETING
   - Conduct 15-min demo
   - Show platform features
   - Answer questions
   - Handle objections
   ↓
8. FOLLOW-UP
   - Send proposal
   - Send pricing
   - Answer additional questions
   ↓
9. SIGNUP
   - Complete registration
   - Choose subscription tier
   - Enter payment info
   - Set preferences
   ↓
10. ONBOARDING
    - Send welcome email
    - Deliver first leads
    - Schedule training call
    - Assign account manager
    ↓
11. ONGOING MANAGEMENT
    - Monitor performance
    - Track lead conversion
    - Identify churn risk
    - Upsell opportunities
    ↓
12. COMPLETE ✅

Success Metrics:
- Contact → Interested: 30-40%
- Interested → Demo: 50-60%
- Demo → Signup: 40-50%
- Overall conversion: 10-15%
- Average time to signup: 14-21 days
```

## **6.4 Lead Purchase & Delivery Workflow**

```
┌───────────────────────────────────────────────────────────────┐
│           LEAD PURCHASE & DELIVERY WORKFLOW                    │
└───────────────────────────────────────────────────────────────┘

1. LEAD AVAILABLE
   - Lead published to marketplace
   - Status: 'available'
   - Matched to contractors in area
   ↓
2. NOTIFICATION SENT
   - Email: New lead available
   - SMS: High-urgency leads
   - Push notification: Mobile app
   - In-app: Dashboard badge
   ↓
3. CONTRACTOR VIEWS PREVIEW
   - Limited info shown:
     * Address (street only, no number)
     * City, state, zip
     * Property value range
     * Quality score
     * Price
     * Roof condition summary
   ↓
4. CONTRACTOR DECIDES TO PURCHASE
   - Clicks "Purchase Lead"
   - Confirms purchase
   ↓
5. PAYMENT PROCESSED
   - Charge subscription account
   - OR charge credit card
   - Generate receipt
   ↓
6. FULL LEAD DETAILS REVEALED
   - Complete address
   - Owner full name
   - Owner email
   - Owner phone
   - Property details (all fields)
   - Roof analysis (full report)
   - Images (all angles)
   - Trigger information
   - Recommended approach
   ↓
7. LEAD MARKED AS SOLD
   - Status: 'sold'
   - Assigned to contractor
   - Removed from marketplace
   - (Exclusive lead)
   ↓
8. CONTRACTOR CONTACTS OWNER
   - Tracks in system (optional):
     * Email sent? (track opens)
     * Call made? (track outcome)
     * Appointment scheduled?
   ↓
9. CONTRACTOR PROVIDES FEEDBACK
   - Lead quality rating (1-5 stars)
   - Contact success? (yes/no)
   - Quote provided?
   - Job won? (yes/no)
   - Job value? ($)
   ↓
10. SYSTEM LEARNS
    - Update scoring algorithm
    - Improve targeting
    - Refund if truly bad lead
    - Flag issues for review
    ↓
11. COMPLETE ✅

Timeline:
- Purchase → Full details: Instant
- Purchase → First contact: ~1-24 hours
- First contact → Quote: ~3-7 days
- Quote → Job won: ~7-30 days
- Average close: 30-45 days
```

---

# 🔗 **7. EXTERNAL INTEGRATIONS** {#integrations}

## **7.1 Data Acquisition APIs**

### **Property Data**
- **Attom Data API**
  - Cost: $0.10-0.25 per lookup
  - Data: Owner info, property details, sales history
  - Free tier: 100 requests/month

- **Melissa Data API**
  - Cost: $0.20 per lookup
  - Data: Property + owner + contact info
  - Free tier: 500 requests

### **Email Finding**
- **Hunter.io**
  - Cost: $0.01-0.05 per email
  - Free tier: 50 searches/month
  - Features: Domain search, email finder

- **Apollo.io**
  - Cost: $0.10 per contact
  - Free tier: 60 searches/month
  - Features: People search, enrichment

- **Clearbit**
  - Cost: $0.50-1.00 per lookup
  - Features: Full profile enrichment
  - Premium data quality

### **Email Verification**
- **ZeroBounce**
  - Cost: $0.001 per verification
  - Free tier: 100 credits
  - Features: Deliverability check, spam trap detection

- **NeverBounce**
  - Cost: $0.008 per verification
  - Features: Real-time validation

### **Geocoding**
- **Mapbox Geocoding API**
  - Cost: Free up to 100,000 requests/month
  - Features: Forward/reverse geocoding, precision

- **Google Geocoding API**
  - Cost: $5 per 1000 requests
  - Free tier: $200 credit/month

## **7.2 Communication APIs**

### **Email**
- **SendGrid**
  - Cost: Free up to 100 emails/day, then $15/month
  - Features: Templates, tracking, webhooks

### **AI Calling**
- **Vapi.ai**
  - Cost: ~$0.10-0.30 per minute
  - Features: Natural conversations, transcription, analysis

- **Bland.ai** (Alternative)
  - Cost: Similar pricing
  - Features: AI agents for outbound calls

### **SMS**
- **Twilio**
  - Cost: $0.0079 per SMS
  - Features: Global coverage, 2-way SMS

### **Scheduling**
- **Calendly API**
  - Features: Demo booking, meeting management

## **7.3 Imagery APIs**

### **Satellite Imagery**
- **Google Maps Static API**
  - Free tier: 18,000 requests/month
  - Cost: $2 per 1000 additional
  - Resolution: Up to 640x640

- **Mapbox Static Images**
  - Free tier: 50,000 requests/month
  - Higher resolution options

- **Nearmap** (Premium)
  - Cost: $5,000-10,000/year
  - Features: Ultra high-res, 3D, frequent updates

### **Street View**
- **Google Street View API**
  - Free tier: 28,000 requests/month
  - Cost: $7 per 1000 additional

## **7.4 Weather Data**

- **NOAA Storm Events Database**
  - Cost: Free
  - Features: Historical storm data, severity info

- **Weather.gov API**
  - Cost: Free
  - Features: Forecasts, warnings, historical data

## **7.5 Payment Processing**

- **Stripe**
  - Cost: 2.9% + $0.30 per transaction
  - Features: Subscriptions, invoicing, refunds

## **7.6 Monitoring & Analytics**

- **Prometheus**
  - Self-hosted metrics
  - Free

- **Grafana**
  - Visualization
  - Free (self-hosted)

- **Sentry** (Error Tracking)
  - Free tier: 5,000 events/month

---

# 🤖 **8. AI/ML COMPONENTS** {#ai-ml}

## **8.1 Local LLM (Ollama)**

### **Models**
- **Primary**: Llama 3.2 3B
  - Size: ~2GB
  - Speed: Fast inference (~1-2 sec)
  - Use: Data extraction from scraped pages

- **Fallback**: Mistral 7B Instruct
  - Size: ~4.1GB
  - Speed: Moderate (~2-4 sec)
  - Use: When Llama fails or needs better reasoning

### **Use Cases**
1. Extract permit data from HTML
2. Extract property data from tax records
3. Extract contractor info from websites
4. Parse unstructured text
5. Classify content types
6. Generate personalized outreach messages

## **8.2 Computer Vision Models**

### **Roof Condition Classifier**
- **Architecture**: ResNet50 or EfficientNet-B3
- **Input**: 224x224 RGB image
- **Output**: 5 classes (Excellent, Good, Fair, Poor, Critical)
- **Training**: 10,000+ labeled roof images
- **Accuracy Target**: 85%+

### **Damage Detector**
- **Architecture**: YOLOv8 Medium
- **Input**: 640x640 RGB image
- **Output**: Bounding boxes + 10 damage classes
- **Training**: 5,000+ images with labeled damage
- **mAP Target**: 75%+

### **Semantic Segmentor**
- **Architecture**: U-Net or DeepLabV3+
- **Input**: 512x512 RGB image
- **Output**: Pixel-wise mask (roof vs. non-roof, damage regions)
- **Training**: 2,000+ segmented images
- **IoU Target**: 85%+

## **8.3 Training Strategy**

### **Data Collection**
1. **Real Images** (Primary - 70%)
   - Scrape contractor websites (before/after galleries)
   - Download from Google Images (search: roof damage types)
   - License from stock photo sites
   - Manual collection (field work)

2. **Synthetic Images** (Secondary - 30%)
   - Augmentation: Rotation, flip, brightness, contrast
   - Weather simulation: Rain, fog, different lighting
   - Damage simulation: Add synthetic defects

### **Labeling**
1. **Initial Labeling**: Claude Vision pre-labeling
2. **Quality Control**: Human expert validation
3. **Active Learning**: Label hardest examples first
4. **Continuous Improvement**: Add mislabeled examples to training

### **Model Training**
- **Framework**: PyTorch
- **Hardware**: GPU (NVIDIA RTX 3090 or better)
- **Training Time**: 2-4 hours per model
- **Validation Split**: 80/10/10 (train/val/test)

## **8.4 Inference Pipeline**

```python
def analyze_roof(image_path):
    # Step 1: Preprocess
    img = preprocess_image(image_path)
    
    # Step 2: Run all models
    classification = run_classifier(img)
    detections = run_detector(img)
    segmentation = run_segmentor(img)
    
    # Step 3: Ensemble
    final_condition = ensemble_decision(
        classification, 
        detections, 
        segmentation
    )
    
    # Step 4: Validation
    confidence = calculate_confidence(
        classification,
        detections,
        segmentation
    )
    
    # Step 5: Return
    return {
        'condition': final_condition,
        'confidence': confidence,
        'damage_types': detections['classes'],
        'damage_severity': calculate_severity(detections),
        'roof_area_sqft': segmentation['area'],
        'repair_cost': estimate_repair_cost(detections),
        'replacement_cost': estimate_replacement_cost(segmentation)
    }
```

---

# ⚙️ **9. CONFIGURATION & SETUP** {#configuration}

## **9.1 Environment Variables**

(See `.env.example` in earlier sections)

## **9.2 City Configurations**

Stored in: `config/cities/city_configs.py`

Each city needs:
```python
{
    "city": "Austin",
    "state": "TX",
    "tier": 1,
    "priority": 100,
    "population": 978908,
    "median_home_value": 550000,
    
    "permit": {
        "url": "...",
        "strategy": "form_submission",
        "wait_for": "...",
        "js_code": "...",
    },
    
    "property": {
        "assessor_url": "...",
        "search_url_template": "...",
        "wait_for": "...",
    }
}
```

## **9.3 Service Ports**

| Service | Port | Purpose |
|---------|------|---------|
| Frontend | 3000 | Next.js web app |
| Backend API | 8000 | Main FastAPI backend |
| Scraper | 8001 | Data acquisition |
| Image Processor | 8002 | Image handling |
| ML Inference | 8003 | AI/ML models |
| Enricher | 8004 | Contact finding |
| Contractor Acquisition | 8005 | Contractor outreach |
| AI Calling | 8006 | Phone automation |
| Outreach Orchestrator | 8007 | Campaign management |
| Lead Generator | 8008 | Scoring & clustering |
| Master Orchestrator | 8009 | System coordination |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache & queues |
| Prometheus | 9090 | Metrics |
| Grafana | 3001 | Dashboards |

## **9.4 Scheduled Jobs**

| Time | Job | Service | Duration |
|------|-----|---------|----------|
| 2:00 AM | Scrape permits (all cities) | Scraper | 1-2 hours |
| 3:00 AM | Scrape weather events | Scraper | 15-30 min |
| 4:00 AM | Process new permits | Orchestrator | 2-4 hours |
| Hourly | Enrich properties | Enricher | Continuous |
| Hourly | ML analysis | ML Inference | Continuous |
| Hourly | Lead generation | Lead Generator | Continuous |
| Every 5 min | Outreach execution | Outreach | Continuous |
| Sunday 1 AM | City expansion | Orchestrator | Variable |
| Sunday 2 AM | Contractor discovery | Contractor Acq | 2-4 hours |

---

# 📊 **10. MONITORING & ANALYTICS** {#monitoring}

## **10.1 Key Metrics**

### **Scraping Performance**
- Success rate by city
- Average scraping time
- Failed scrapes by source
- API costs
- Cache hit rate

### **Data Quality**
- Email match rate (target: 85%)
- Email verification rate (target: 90%)
- Address validation rate (target: 95%)
- ML confidence scores (target: 85%+)

### **Lead Quality**
- Average quality score
- Score distribution
- Conversion rate (lead → job)
- Contractor satisfaction ratings

### **Contractor Acquisition**
- Contractors discovered per city
- Contact → signup conversion
- Email open rates
- Call answer rates
- Demo → signup rate
- Churn rate

### **Financial**
- Revenue per city
- Cost per lead
- Cost per contractor acquisition
- Profit margins
- Customer lifetime value

## **10.2 Dashboards**

### **Operations Dashboard**
- Real-time scraping status
- Active jobs count
- Queue sizes
- Error rates
- System health

### **Business Dashboard**
- Daily revenue
- Leads generated
- Leads sold
- Active contractors
- City performance

### **Marketing Dashboard**
- Campaign performance
- Channel effectiveness
- Conversion funnels
- A/B test results

---

# 🔒 **11. SECURITY & COMPLIANCE** {#security}

## **11.1 Data Security**

- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: TLS/SSL for all APIs
- **Access Control**: JWT-based authentication
- **API Keys**: Secure storage in environment variables
- **PII Protection**: Hash/encrypt sensitive data

## **11.2 Legal Compliance**

### **Data Scraping**
- ✅ Only public data
- ✅ Respect robots.txt
- ✅ Rate limiting
- ✅ No authentication bypass

### **Email (CAN-SPAM)**
- ✅ Physical address in footer
- ✅ One-click unsubscribe
- ✅ Clear "From" line
- ✅ Accurate subject lines
- ✅ Honor opt-outs within 10 days

### **Phone (TCPA)**
- ✅ Check Do Not Call registry
- ✅ Call 8am-9pm local time
- ✅ Identify caller clearly
- ✅ Honor opt-out requests

### **Privacy**
- ✅ GDPR compliance (if applicable)
- ✅ CCPA compliance (California)
- ✅ Clear privacy policy
- ✅ Data retention policies

---

# ✅ **12. IMPLEMENTATION CHECKLIST**

## **Phase 1: Foundation (Week 1)**
- [ ] Setup project structure
- [ ] Create all Docker services
- [ ] Setup PostgreSQL + PostGIS
- [ ] Setup Redis
- [ ] Run database migrations
- [ ] Seed target cities
- [ ] Configure city scraping

## **Phase 2: Data Acquisition (Week 2-3)**
- [ ] Setup Ollama + models
- [ ] Implement Crawl4AI scraper
- [ ] Implement fallback scrapers
- [ ] Test permit scraping (5 cities)
- [ ] Implement property scraping
- [ ] Implement image downloading
- [ ] Test end-to-end scraping

## **Phase 3: Enrichment (Week 4)**
- [ ] Implement email finder (all strategies)
- [ ] Setup email verification
- [ ] Implement phone finder
- [ ] Implement geocoding
- [ ] Test enrichment pipeline
- [ ] Optimize costs

## **Phase 4: ML Analysis (Week 5-6)**
- [ ] Collect training data (10K images)
- [ ] Train classifier model
- [ ] Train detector model
- [ ] Train segmentor model
- [ ] Implement ensemble logic
- [ ] Implement validation framework
- [ ] Test ML pipeline
- [ ] Achieve 85%+ accuracy

## **Phase 5: Lead Generation (Week 7)**
- [ ] Implement scoring algorithm
- [ ] Implement trigger detection
- [ ] Implement clustering
- [ ] Implement dynamic pricing
- [ ] Test lead generation
- [ ] Integrate with marketplace

## **Phase 6: Contractor Acquisition (Week 8-9)**
- [ ] Implement contractor discovery
- [ ] Setup email campaigns
- [ ] Integrate AI calling (Vapi)
- [ ] Setup SMS
- [ ] Create email templates
- [ ] Test outreach workflows
- [ ] Launch first campaign

## **Phase 7: Integration & Testing (Week 10)**
- [ ] Test all workflows end-to-end
- [ ] Performance testing (1000 properties)
- [ ] Load testing
- [ ] Fix bugs
- [ ] Optimize bottlenecks
- [ ] Setup monitoring

## **Phase 8: Launch (Week 11)**
- [ ] Deploy to production
- [ ] Activate Tier 1 cities (15 cities)
- [ ] Start contractor outreach
- [ ] Monitor system closely
- [ ] Fix issues as they arise
- [ ] Generate first leads

## **Phase 9: Scale (Week 12+)**
- [ ] Activate Tier 2 cities
- [ ] Onboard contractors
- [ ] Sell first leads
- [ ] Collect feedback
- [ ] Iterate and improve
- [ ] Expand to more cities

---

# 🎯 **SUMMARY**

This document captures **EVERY** feature, component, workflow, integration, and requirement discussed for the roofing lead generation platform. It includes:

✅ **9 Microservices** with complete specifications
✅ **75 Target Cities** with individual configurations
✅ **Complete Database Schema** (25+ tables)
✅ **100+ API Endpoints** across all services
✅ **Multi-tier email acquisition** (free → paid strategies)
✅ **AI/ML pipeline** (3 models + ensemble)
✅ **Automated workflows** (property, city, contractor)
✅ **Multi-channel outreach** (email, AI calls, SMS)
✅ **Lead scoring & clustering** algorithms
✅ **Contractor acquisition** automation
✅ **Scheduled jobs** (daily, hourly, weekly)
✅ **External integrations** (20+ APIs)
✅ **Monitoring & analytics** dashboards
✅ **Security & compliance** requirements

This is the **complete blueprint** for building a production-ready, fully automated roofing lead generation platform that can generate $500K+/month in revenue.

Use this document as the **master reference** for your SpecKit configuration and give it to AI agents for implementation. Every feature is documented, every workflow is defined, and every technical detail is specified.

🚀 **Ready to build your empire!**