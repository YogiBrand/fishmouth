# FISHMOUTH COMPLETE TECHNICAL SPECIFICATION
## The World's Most Advanced Roofing Lead Generation Platform

### Executive Technical Summary
Fishmouth represents a revolutionary approach to roofing lead generation, combining AI-driven intelligence, computer vision, real-time data processing, and multi-modal analysis to create the most comprehensive and accurate lead generation system ever built. This document provides complete technical specifications, implementation details, current codebase analysis, and comprehensive feature documentation.

---

## 1. CURRENT PLATFORM ARCHITECTURE ANALYSIS

### 1.1 Microservices Infrastructure
The platform is built on a distributed microservices architecture with the following services:

#### Core Services
```
services/
├── orchestrator/          # Central coordination service (Port 8001)
├── scraper-service/       # Web scraping & data collection (Port 8011)
├── enrichment-service/    # Data validation & enrichment (Port 8004)
├── lead-generator/        # Lead scoring & clustering (Port 8008)
├── image-processor/       # Computer vision & imagery analysis (Port 8002)
├── ml-inference/          # Machine learning models (Port 8003)
```

#### Backend Services
```
backend/                   # Main FastAPI application (Port 8000)
├── app/
│   ├── api/v1/           # REST API endpoints
│   ├── models/           # Database models
│   ├── services/         # Business logic
│   └── dependencies/     # Dependency injection
├── migrations/           # Database migrations
├── tests/               # Test suites
└── scripts/             # Utility scripts
```

#### Frontend Application
```
frontend/                 # React.js application (Port 3000)
├── src/
│   ├── components/       # React components
│   ├── pages/           # Page components
│   ├── services/        # API clients
│   ├── contexts/        # React contexts
│   └── config/          # Configuration
└── public/              # Static assets
```

### 1.2 Database Architecture

#### Primary Database: PostgreSQL with PostGIS
```sql
-- Core data tables
raw_properties          -- Scraped property data
raw_permits            -- Building permit records
raw_contractors        -- Contractor information
enrichment_jobs        -- Data enrichment tracking
lead_scores           -- Calculated lead scores
scraping_jobs         -- Web scraping job status
storm_events          -- Weather event tracking
image_analyses        -- Computer vision results
```

#### Cache Layer: Redis
```
Redis clusters for:
- Session storage
- API response caching
- Real-time data caching
- Queue management
- Distributed locks
```

### 1.3 Technology Stack Breakdown

#### Backend Technologies
- **FastAPI**: Modern, fast Python web framework
- **PostgreSQL**: Primary relational database
- **PostGIS**: Geospatial database extension
- **Redis**: Caching and session storage
- **SQLAlchemy**: ORM and database toolkit
- **Alembic**: Database migration tool
- **Celery**: Distributed task queue
- **Pydantic**: Data validation and settings
- **Structlog**: Structured logging
- **Uvicorn**: ASGI server

#### Frontend Technologies
- **React.js**: Component-based UI framework
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **Tanstack Query**: Data fetching and caching
- **React Router**: Client-side routing
- **Zustand**: State management
- **React Hook Form**: Form handling
- **Recharts**: Data visualization
- **Radix UI**: Accessible UI components

#### AI/ML Technologies
- **OpenRouter**: AI model orchestration
- **Ollama**: Local LLM deployment
- **YOLOv8**: Object detection
- **ESRGAN**: Image super-resolution
- **MobileNet-SSD**: Lightweight object detection
- **OpenCV**: Computer vision
- **NumPy/Pandas**: Data processing
- **Scikit-learn**: Machine learning

#### Infrastructure Technologies
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Nginx**: Reverse proxy and load balancer
- **Terraform**: Infrastructure as code
- **Prometheus**: Metrics collection
- **Grafana**: Metrics visualization
- **ELK Stack**: Logging and search

---

## 2. DETAILED SERVICE SPECIFICATIONS

### 2.1 Orchestrator Service (Port 8001)

#### Purpose
Central coordination hub that manages workflow orchestration, city processing, health monitoring, and inter-service communication.

#### Key Components
```python
app/
├── main.py                    # FastAPI application entry point
├── monitoring/
│   └── health_monitor.py      # Health check coordination
└── workflows/
    └── city_processor.py      # City-wide data processing
```

#### API Endpoints
```
GET  /healthz                  # Service health check
GET  /readyz                   # Readiness probe
POST /orchestrate/city         # Process entire city
POST /orchestrate/workflow     # Execute custom workflows
GET  /status/{job_id}          # Job status tracking
```

#### City Processing Workflow
```python
async def process_city(city: str, state: str, workflow_config: dict):
    """
    Orchestrates complete city processing:
    1. Permit data collection
    2. Property enrichment
    3. Image analysis
    4. Lead scoring
    5. Quality assessment
    """
    # Multi-service coordination
    # Real-time progress tracking
    # Error handling and recovery
    # Quality validation
```

### 2.2 Scraper Service (Port 8011)

#### Purpose
Intelligent web scraping using Crawl4AI and Ollama for extracting permits, property data, and contractor information.

#### Key Components
```python
app/
├── main.py                    # FastAPI application
├── scrapers/
│   └── smart_scraper.py       # AI-powered scraping
└── utils/
    └── llm.py                 # Local LLM integration
```

#### Scraping Capabilities
- **Permit Scraping**: Municipal permit databases
- **Property Scraping**: Real estate records
- **Contractor Scraping**: Contractor directories
- **Batch Processing**: Concurrent URL processing
- **Smart Extraction**: AI-powered data extraction

#### API Endpoints
```
POST /scrape                   # Single URL scraping
POST /scrape/batch             # Batch URL scraping
POST /jobs                     # Create scraping job
GET  /jobs/{job_id}            # Job status
GET  /jobs                     # List recent jobs
```

#### Smart Scraper Implementation
```python
class SmartScraper:
    """AI-powered web scraper with fallback strategies"""
    
    async def scrape_permits(self, url: str, wait_for: str = None, js_code: str = None):
        """Extract permit data with AI assistance"""
        
    async def scrape_property(self, url: str, wait_for: str = None):
        """Extract property information"""
        
    async def scrape_contractor(self, url: str):
        """Extract contractor details"""
```

### 2.3 Enrichment Service (Port 8004)

#### Purpose
Data validation, enrichment, and quality enhancement using multiple external APIs and validation services.

#### Key Components
```python
app/
├── main.py                    # FastAPI application
├── enrichment/
│   ├── property_enricher.py   # Property data enrichment
│   ├── email_finder.py        # Contact discovery
│   └── address_validator.py   # Address validation
```

#### Enrichment Capabilities
- **Address Validation**: USPS, Google, HERE APIs
- **Property Enrichment**: Zillow, Realty Mole, DataTree
- **Contact Discovery**: Buster, MailSleuth, Social Analyzer
- **Phone Lookup**: Whitepages, TrueCaller
- **Business Verification**: Google Places, Yelp

#### API Endpoints
```
POST /enrich/property          # Property data enrichment
POST /enrich/email             # Email lookup
POST /validate/address         # Address validation
POST /jobs                     # Create enrichment job
GET  /jobs/{job_id}            # Job status
POST /enrich/batch             # Batch enrichment
```

#### Multi-Tier Enrichment Strategy
```python
class PropertyEnricher:
    """Multi-source property enrichment with fallbacks"""
    
    async def enrich_property(self, address: str, lat: float, lon: float):
        """
        Tier 1: Free APIs (Census, USGS)
        Tier 2: Freemium APIs (Limited quotas)
        Tier 3: Premium APIs (Paid services)
        """
```

### 2.4 Lead Generator Service (Port 8008)

#### Purpose
Advanced lead scoring, geographic clustering, and lead packaging using machine learning algorithms.

#### Key Components
```python
app/
├── main.py                    # FastAPI application
├── scoring/
│   └── lead_scorer.py         # ML-based lead scoring
├── clustering/
│   └── geo_clusterer.py       # Geographic clustering
└── triggers/
    └── trigger_detector.py    # Buying signal detection
```

#### Scoring Algorithm
```python
class LeadScorer:
    """Advanced lead scoring with ML"""
    
    def calculate_scores(self, property_data: dict, enrichment_data: dict):
        """
        Scoring components:
        - Roof age score (40% weight)
        - Property value score (25% weight)
        - Storm activity score (20% weight)
        - Neighborhood score (10% weight)
        - Owner match score (5% weight)
        """
```

#### API Endpoints
```
POST /score                    # Score single lead
POST /score/batch              # Batch scoring
POST /cluster                  # Create geographic clusters
POST /package                  # Package leads for delivery
GET  /leads/top                # Get high-scoring leads
POST /score/background         # Background scoring
```

### 2.5 Image Processor Service (Port 8002)

#### Purpose
Computer vision analysis for roof condition assessment, damage detection, and property evaluation.

#### Key Components
```python
├── main.py                    # FastAPI application
├── models/
│   ├── roof_detector.py       # Roof detection with YOLOv8
│   ├── damage_classifier.py   # Damage classification
│   └── quality_enhancer.py    # Image enhancement with ESRGAN
├── processors/
│   ├── satellite_processor.py # Satellite imagery analysis
│   ├── street_view_processor.py # Street view processing
│   └── drone_processor.py     # Drone imagery analysis
└── utils/
    ├── image_utils.py         # Image processing utilities
    └── geo_utils.py           # Geospatial utilities
```

#### Computer Vision Pipeline
```python
class RoofAnalyzer:
    """Complete roof analysis pipeline"""
    
    async def analyze_property(self, lat: float, lon: float):
        """
        1. Satellite image acquisition
        2. Roof detection and segmentation
        3. Damage assessment
        4. Age estimation
        5. Quality scoring
        """
```

#### API Endpoints
```
POST /analyze                  # Analyze property imagery
POST /analyze/batch            # Batch analysis
POST /enhance                  # Enhance image quality
GET  /analysis/{property_id}   # Get analysis results
POST /detect/damage            # Damage detection
POST /segment/roof             # Roof segmentation
```

---

## 3. COMPLETE FEATURE SPECIFICATIONS

### 3.1 Data Collection Features

#### 3.1.1 Permit Scraping
- **Municipal Database Integration**: Automated scraping of building permit databases
- **Multi-Format Support**: PDF, HTML, XML, CSV parsing
- **Smart Field Extraction**: AI-powered data extraction from unstructured sources
- **Historical Data Collection**: Retroactive permit gathering
- **Real-time Monitoring**: Continuous new permit detection

#### 3.1.2 Property Data Acquisition
- **Public Records Integration**: County assessor databases
- **Real Estate Platform APIs**: Zillow, Realty Mole integration
- **Census Data Integration**: Demographic and economic data
- **Satellite Imagery**: High-resolution property imagery
- **Street View Integration**: Google Street View API

#### 3.1.3 Contractor Intelligence
- **License Verification**: State licensing database checks
- **Business Registration**: Secretary of State verifications
- **Review Aggregation**: BBB, Google, Yelp reviews
- **Insurance Verification**: Coverage validation
- **Performance Tracking**: Historical project analysis

### 3.2 AI-Powered Analysis Features

#### 3.2.1 Computer Vision Capabilities
```python
# Roof Detection Pipeline
roof_detector = YOLOv8Model("roof_detection_v3.pt")
damage_classifier = DamageClassifier("damage_model_v2.pt")
quality_enhancer = ESRGANModel("esrgan_lite.pt")

async def analyze_roof_condition(image_data):
    # Multi-stage analysis
    roof_segments = await roof_detector.detect(image_data)
    damage_assessment = await damage_classifier.classify(roof_segments)
    quality_score = calculate_condition_score(damage_assessment)
    return RoofAnalysis(segments=roof_segments, damage=damage_assessment, score=quality_score)
```

#### 3.2.2 Natural Language Processing
- **Permit Description Analysis**: Work scope extraction
- **Contractor Review Sentiment**: Quality assessment
- **Document Classification**: Permit type identification
- **Entity Extraction**: Address, name, license normalization

#### 3.2.3 Predictive Analytics
- **Storm Impact Modeling**: Weather damage prediction
- **Roof Lifecycle Estimation**: Age-based deterioration
- **Market Timing Analysis**: Optimal contact timing
- **Conversion Probability**: Lead quality prediction

### 3.3 Lead Intelligence Features

#### 3.3.1 Multi-Dimensional Scoring
```python
class AdvancedLeadScorer:
    def calculate_comprehensive_score(self, property_data):
        """
        Advanced scoring algorithm considering:
        - Roof condition (40%)
        - Property value (25%)
        - Storm exposure (20%)
        - Owner demographics (10%)
        - Urgency indicators (5%)
        """
        scores = {
            'roof_condition': self.score_roof_condition(property_data),
            'property_value': self.score_property_value(property_data),
            'storm_exposure': self.score_storm_exposure(property_data),
            'demographics': self.score_demographics(property_data),
            'urgency': self.score_urgency_indicators(property_data)
        }
        return self.weighted_composite_score(scores)
```

#### 3.3.2 Geographic Clustering
- **Proximity-Based Grouping**: Route optimization for contractors
- **Density Analysis**: High-value area identification
- **Market Penetration**: Competitor analysis integration
- **Efficiency Scoring**: Cost-per-lead optimization

#### 3.3.3 Behavioral Triggers
- **Storm Event Correlation**: Weather-based triggering
- **Permit Activity Monitoring**: Construction activity tracking
- **Seasonal Patterns**: Timing optimization
- **Economic Indicators**: Market condition analysis

### 3.4 Contact Discovery Features

#### 3.4.1 Multi-Source Email Discovery
```python
class EmailDiscoveryEngine:
    def __init__(self):
        self.sources = [
            BusterSearcher(),      # Professional email finder
            MailSleuthAPI(),       # Contact database
            SocialAnalyzer(),      # Social media profiles
            WhoisLookup(),         # Domain registration
            GoogleSearchAPI()      # Advanced search patterns
        ]
    
    async def find_contact_info(self, property_owner):
        """Comprehensive contact discovery"""
        results = []
        for source in self.sources:
            contacts = await source.search(property_owner)
            results.extend(self.validate_contacts(contacts))
        return self.rank_by_confidence(results)
```

#### 3.4.2 Phone Number Verification
- **Carrier Validation**: Number portability checks
- **Line Type Detection**: Mobile vs landline identification
- **Do Not Call Registry**: Compliance verification
- **Number Quality Scoring**: Deliverability assessment

#### 3.4.3 Social Media Integration
- **Profile Discovery**: Facebook, LinkedIn, Twitter
- **Verification Cross-Reference**: Multi-platform validation
- **Interest Analysis**: Roofing-related content detection
- **Communication Preferences**: Platform preference identification

---

## 4. DATABASE SCHEMA SPECIFICATIONS

### 4.1 Core Data Models

#### 4.1.1 Property Data Model
```sql
CREATE TABLE raw_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES scraping_jobs(id),
    
    -- Property Address
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip TEXT,
    formatted_address TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    
    -- Owner Information
    owner_name TEXT,
    owner_address TEXT,
    owner_city TEXT,
    owner_state TEXT,
    owner_zip TEXT,
    owner_phone TEXT,
    owner_email TEXT,
    
    -- Property Details
    property_value DECIMAL(12,2),
    assessed_value DECIMAL(12,2),
    year_built INTEGER,
    sqft INTEGER,
    lot_size DECIMAL(10,2),
    beds INTEGER,
    baths DECIMAL(3,1),
    property_type TEXT,
    
    -- Roof Information
    roof_material TEXT,
    roof_age INTEGER,
    roof_condition TEXT,
    last_roof_replacement DATE,
    
    -- Processing Status
    processed BOOLEAN DEFAULT FALSE,
    enriched BOOLEAN DEFAULT FALSE,
    scored BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Geospatial Index
CREATE INDEX idx_properties_location ON raw_properties USING GIST(ST_Point(longitude, latitude));
```

#### 4.1.2 Lead Scoring Model
```sql
CREATE TABLE lead_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES raw_properties(id),
    
    -- Component Scores (0-100)
    overall_score INTEGER NOT NULL,
    roof_age_score INTEGER,
    property_value_score INTEGER,
    storm_activity_score INTEGER,
    neighborhood_score INTEGER,
    owner_match_score INTEGER,
    urgency_score INTEGER,
    
    -- Derived Metrics
    buying_signals JSONB,           -- Array of detected signals
    triggers_detected JSONB,        -- Array of trigger events
    confidence_level DECIMAL(3,2),  -- 0.00-1.00
    
    -- Pricing Information
    pricing_tier TEXT,              -- premium, standard, budget
    price_per_lead DECIMAL(8,2),
    estimated_value DECIMAL(10,2),  -- Potential contract value
    
    -- Metadata
    scoring_model_version TEXT,
    calculated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.1.3 Image Analysis Model
```sql
CREATE TABLE image_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES raw_properties(id),
    
    -- Image Sources
    image_url TEXT,
    image_type TEXT,                -- satellite, street_view, drone
    image_source TEXT,              -- google, bing, mapillary
    
    -- Analysis Results
    roof_detected BOOLEAN,
    roof_segments JSONB,            -- Detected roof polygons
    damage_detected BOOLEAN,
    damage_locations JSONB,         -- Damage coordinates
    damage_severity TEXT,           -- minor, moderate, severe
    
    -- Condition Assessment
    condition_score INTEGER,        -- 0-100
    estimated_age INTEGER,          -- Years
    material_detected TEXT,
    color_analysis JSONB,
    
    -- Technical Metadata
    confidence_scores JSONB,
    processing_time DECIMAL(6,3),
    model_version TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 Enrichment and Job Tracking

#### 4.2.1 Enrichment Jobs
```sql
CREATE TABLE enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,    -- raw_properties, raw_permits, etc.
    source_id UUID NOT NULL,
    enrichment_type TEXT NOT NULL, -- email_lookup, phone_lookup, etc.
    
    -- Job Status
    status TEXT DEFAULT 'pending', -- pending, running, completed, failed
    progress DECIMAL(3,2),         -- 0.00-1.00
    
    -- Results
    result JSONB,
    cost DECIMAL(8,4),
    
    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    -- Timing
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- API Usage Tracking
    api_calls_made INTEGER DEFAULT 0,
    data_sources_used JSONB
);
```

#### 4.2.2 Storm Event Tracking
```sql
CREATE TABLE storm_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event Details
    event_type TEXT NOT NULL,      -- hurricane, tornado, hail, wind
    severity INTEGER,              -- 1-5 scale
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    
    -- Geographic Impact
    affected_region GEOMETRY(POLYGON, 4326),
    center_point GEOMETRY(POINT, 4326),
    radius_miles DECIMAL(6,2),
    
    -- Weather Data
    wind_speed INTEGER,            -- mph
    hail_size DECIMAL(3,1),       -- inches
    rainfall DECIMAL(4,1),        -- inches
    
    -- Data Sources
    noaa_event_id TEXT,
    nws_warnings JSONB,
    
    -- Impact Assessment
    properties_affected INTEGER,
    estimated_damage DECIMAL(15,2),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Spatial index for geographic queries
CREATE INDEX idx_storm_events_region ON storm_events USING GIST(affected_region);
```

---

## 5. API INTEGRATION SPECIFICATIONS

### 5.1 Data Source APIs

#### 5.1.1 Government Data APIs
```python
class GovernmentDataIntegrator:
    """Integration with government data sources"""
    
    def __init__(self):
        self.apis = {
            'census': CensusBureauAPI(),
            'noaa': NOAAWeatherAPI(),
            'usgs': USGSEarthExplorerAPI(),
            'fema': FEMADisasterAPI(),
            'data_gov': DataGovAPI()
        }
    
    async def get_census_data(self, lat: float, lon: float):
        """Retrieve demographic and economic data"""
        return await self.apis['census'].get_acs_data(lat, lon)
    
    async def get_weather_history(self, lat: float, lon: float, years: int = 5):
        """Historical weather and storm data"""
        return await self.apis['noaa'].get_storm_history(lat, lon, years)
```

#### 5.1.2 Property Data APIs
```python
class PropertyDataAggregator:
    """Multi-source property data collection"""
    
    def __init__(self):
        self.sources = {
            'realty_mole': RealtyMoleAPI(),
            'attom_data': AttomDataAPI(),
            'zillow': ZillowAPI(),
            'rentspree': RentspreeAPI()
        }
    
    async def enrich_property(self, address: str):
        """Aggregate property data from multiple sources"""
        results = {}
        for source_name, source_api in self.sources.items():
            try:
                data = await source_api.get_property_data(address)
                results[source_name] = data
            except Exception as e:
                logger.warning(f"Failed to get data from {source_name}: {e}")
        
        return self.merge_property_data(results)
```

#### 5.1.3 Contact Discovery APIs
```python
class ContactDiscoveryEngine:
    """Multi-source contact information discovery"""
    
    def __init__(self):
        self.email_sources = {
            'buster': BusterAPI(),
            'mail_sleuth': MailSleuthAPI(),
            'clearbit': ClearbitAPI(),
            'voila_norbert': VoilaNorbertAPI()
        }
        
        self.phone_sources = {
            'whitepages': WhitepagesAPI(),
            'truecaller': TruecallerAPI(),
            'numverify': NumverifyAPI()
        }
    
    async def find_email(self, first_name: str, last_name: str, domain: str = None):
        """Comprehensive email discovery"""
        results = []
        for source_name, source_api in self.email_sources.items():
            try:
                emails = await source_api.find_email(first_name, last_name, domain)
                for email in emails:
                    email.source = source_name
                    results.append(email)
            except Exception as e:
                logger.warning(f"Email search failed for {source_name}: {e}")
        
        return self.rank_and_verify_emails(results)
```

### 5.2 AI/ML Model APIs

#### 5.2.1 OpenRouter Integration
```python
class OpenRouterClient:
    """OpenRouter API for model orchestration"""
    
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY")
        )
        
        # Model fallback hierarchy
        self.models = [
            "meta-llama/llama-3.1-8b-instruct:free",
            "mistralai/mistral-7b-instruct:free",
            "huggingface/microsoft/DialoGPT-medium:free",
            "ollama/llama3.1:8b"  # Local fallback
        ]
    
    async def extract_data(self, content: str, schema: dict):
        """Extract structured data using AI"""
        prompt = f"""
        Extract the following data from the content below.
        Return only valid JSON matching this schema: {json.dumps(schema)}
        
        Content: {content}
        """
        
        for model in self.models:
            try:
                response = await self.client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=1000,
                    temperature=0.1
                )
                
                result = response.choices[0].message.content
                return json.loads(result)
                
            except Exception as e:
                logger.warning(f"Model {model} failed: {e}")
                continue
        
        raise Exception("All AI models failed")
```

#### 5.2.2 Computer Vision APIs
```python
class VisionAnalysisEngine:
    """Computer vision model orchestration"""
    
    def __init__(self):
        self.models = {
            'roof_detector': YOLOv8Model("models/roof_detection_v3.pt"),
            'damage_classifier': TorchModel("models/damage_classifier_v2.pt"),
            'quality_enhancer': ESRGANModel("models/esrgan_lite.pt"),
            'segmentation': SAMModel("models/sam_vit_b.pt")
        }
    
    async def analyze_roof_image(self, image_data: bytes):
        """Complete roof analysis pipeline"""
        # Enhance image quality
        enhanced_image = await self.models['quality_enhancer'].enhance(image_data)
        
        # Detect roof areas
        roof_detections = await self.models['roof_detector'].detect(enhanced_image)
        
        # Segment roof areas
        roof_masks = await self.models['segmentation'].segment(enhanced_image, roof_detections)
        
        # Classify damage
        damage_analysis = await self.models['damage_classifier'].classify(enhanced_image, roof_masks)
        
        return RoofAnalysisResult(
            detections=roof_detections,
            masks=roof_masks,
            damage=damage_analysis,
            confidence=self.calculate_confidence(roof_detections, damage_analysis)
        )
```

---

## 6. FRONTEND COMPONENT SPECIFICATIONS

### 6.1 React Component Architecture

#### 6.1.1 Main Application Structure
```jsx
// App.jsx - Main application component
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Pages
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import ScanPage from './pages/ScanPage';
import ReportPage from './pages/ReportPage';
import Login from './pages/Login';
import Signup from './pages/Signup';

// Components
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
              <Navbar />
              <main className="container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/scan" element={
                    <ProtectedRoute>
                      <ScanPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/reports/:reportId" element={
                    <ProtectedRoute>
                      <ReportPage />
                    </ProtectedRoute>
                  } />
                </Routes>
              </main>
            </div>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

#### 6.1.2 Dashboard Component
```jsx
// pages/Dashboard.jsx - Main dashboard
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Activity, 
  MapPin, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  Eye,
  Target,
  DollarSign
} from 'lucide-react';

// Components
import DashboardKpiRow from '../components/DashboardKpiRow';
import LeadQueueTabs from '../components/LeadQueueTabs';
import Map from '../components/Map/Map';
import RecentActivity from '../components/RecentActivity';

// Services
import { dashboardAPI } from '../services/api';

function Dashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [selectedRegion, setSelectedRegion] = useState('all');

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard', selectedTimeframe, selectedRegion],
    queryFn: () => dashboardAPI.getDashboardSummary(selectedTimeframe, selectedRegion),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch real-time metrics
  const { data: realtimeMetrics } = useQuery({
    queryKey: ['dashboard-realtime'],
    queryFn: () => dashboardAPI.getRealtimeMetrics(),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  if (isLoading) return <DashboardSkeleton />;
  if (error) return <ErrorDisplay error={error} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Lead Intelligence Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time roofing lead analysis and opportunity tracking
          </p>
        </div>
        
        <div className="flex space-x-4">
          <TimeframeSelector 
            value={selectedTimeframe}
            onChange={setSelectedTimeframe}
          />
          <RegionSelector 
            value={selectedRegion}
            onChange={setSelectedRegion}
          />
        </div>
      </div>

      {/* KPI Row */}
      <DashboardKpiRow 
        data={dashboardData?.kpis}
        realtimeData={realtimeMetrics}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lead Queue */}
        <div className="lg:col-span-2">
          <LeadQueueTabs 
            leads={dashboardData?.leads}
            onLeadUpdate={refetch}
          />
        </div>
        
        {/* Map View */}
        <div className="lg:col-span-1">
          <Map 
            leads={dashboardData?.leads}
            stormEvents={dashboardData?.storms}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
          />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <RecentActivity 
          activities={dashboardData?.recentActivity}
        />
        
        {/* Performance Analytics */}
        <PerformanceAnalytics 
          data={dashboardData?.performance}
          timeframe={selectedTimeframe}
        />
      </div>
    </div>
  );
}

export default Dashboard;
```

#### 6.1.3 Advanced Map Component
```jsx
// components/Map/Map.jsx - Interactive lead map
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl } from 'react-leaflet';
import { LatLngExpression } from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';

// Custom hooks
import { useMapData } from '../../hooks/useMapData';
import { useStormTracking } from '../../hooks/useStormTracking';

// Components
import LeadMarker from './LeadMarker';
import StormOverlay from './StormOverlay';
import HeatmapLayer from './HeatmapLayer';
import DrawingTools from './DrawingTools';

interface MapProps {
  leads: Lead[];
  stormEvents: StormEvent[];
  selectedRegion: string;
  onRegionChange: (region: string) => void;
  onLeadSelect?: (lead: Lead) => void;
}

function Map({ leads, stormEvents, selectedRegion, onRegionChange, onLeadSelect }: MapProps) {
  const mapRef = useRef(null);
  const [mapCenter, setMapCenter] = useState<LatLngExpression>([39.8283, -98.5795]); // Center of US
  const [mapZoom, setMapZoom] = useState(6);
  const [selectedLayers, setSelectedLayers] = useState({
    leads: true,
    storms: true,
    heatmap: false,
    satelliteImagery: false
  });

  // Custom hooks for data management
  const { clusteredLeads, leadStats } = useMapData(leads, mapZoom);
  const { activeStorms, stormAlerts } = useStormTracking(stormEvents);

  // Update map view when region changes
  useEffect(() => {
    if (selectedRegion !== 'all' && mapRef.current) {
      const regionBounds = getRegionBounds(selectedRegion);
      mapRef.current.fitBounds(regionBounds);
    }
  }, [selectedRegion]);

  return (
    <div className="h-96 lg:h-full rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        ref={mapRef}
        center={mapCenter}
        zoom={mapZoom}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <LayersControl position="topright">
          {/* Base Layers */}
          <LayersControl.BaseLayer checked name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
            />
          </LayersControl.BaseLayer>
          
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            />
          </LayersControl.BaseLayer>

          {/* Lead Markers */}
          {selectedLayers.leads && (
            <LayersControl.Overlay checked name="Leads">
              <MarkerClusterGroup chunkedLoading>
                {clusteredLeads.map((lead) => (
                  <LeadMarker
                    key={lead.id}
                    lead={lead}
                    onClick={() => onLeadSelect?.(lead)}
                  />
                ))}
              </MarkerClusterGroup>
            </LayersControl.Overlay>
          )}

          {/* Storm Overlays */}
          {selectedLayers.storms && (
            <LayersControl.Overlay checked name="Storm Events">
              <StormOverlay storms={activeStorms} />
            </LayersControl.Overlay>
          )}

          {/* Heatmap Layer */}
          {selectedLayers.heatmap && (
            <LayersControl.Overlay name="Lead Density Heatmap">
              <HeatmapLayer leads={leads} />
            </LayersControl.Overlay>
          )}
        </LayersControl>

        {/* Drawing Tools */}
        <DrawingTools onAreaSelected={onRegionChange} />
        
        {/* Storm Alerts */}
        {stormAlerts.map((alert) => (
          <StormAlert key={alert.id} alert={alert} />
        ))}
      </MapContainer>

      {/* Map Statistics */}
      <div className="absolute top-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-10">
        <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-2">
          Map Statistics
        </h3>
        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
          <div>Total Leads: {leadStats.total}</div>
          <div>High Priority: {leadStats.highPriority}</div>
          <div>Active Storms: {activeStorms.length}</div>
        </div>
      </div>
    </div>
  );
}

export default Map;
```

### 6.2 Advanced Components

#### 6.2.1 Scan Wizard Component
```jsx
// components/ScanWizard.jsx - Multi-step scanning interface
import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MapPin, Upload, Settings, Play, CheckCircle } from 'lucide-react';

// Form validation schema
const scanConfigSchema = z.object({
  scanType: z.enum(['city', 'region', 'address']),
  location: z.object({
    city: z.string().min(1, 'City is required'),
    state: z.string().min(2, 'State is required'),
    zipCode: z.string().optional(),
  }),
  options: z.object({
    includePermits: z.boolean().default(true),
    includeProperties: z.boolean().default(true),
    includeImagery: z.boolean().default(true),
    maxResults: z.number().min(1).max(10000).default(1000),
    qualityThreshold: z.number().min(0).max(100).default(70),
  }),
});

type ScanConfig = z.infer<typeof scanConfigSchema>;

interface ScanWizardProps {
  onScanStart: (config: ScanConfig) => void;
  onCancel: () => void;
}

function ScanWizard({ onScanStart, onCancel }: ScanWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isValidating, setIsValidating] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<ScanConfig>({
    resolver: zodResolver(scanConfigSchema),
    mode: 'onChange',
    defaultValues: {
      scanType: 'city',
      options: {
        includePermits: true,
        includeProperties: true,
        includeImagery: true,
        maxResults: 1000,
        qualityThreshold: 70,
      }
    }
  });

  const watchedScanType = watch('scanType');
  const watchedLocation = watch('location');

  const steps = [
    { id: 1, title: 'Location', icon: MapPin },
    { id: 2, title: 'Data Sources', icon: Upload },
    { id: 3, title: 'Configuration', icon: Settings },
    { id: 4, title: 'Review', icon: CheckCircle },
  ];

  const validateLocation = useCallback(async (location: any) => {
    setIsValidating(true);
    try {
      // Validate location with geocoding API
      const response = await fetch(`/api/v1/geocode?city=${location.city}&state=${location.state}`);
      const data = await response.json();
      
      if (!data.valid) {
        throw new Error('Invalid location');
      }
      
      return true;
    } catch (error) {
      throw new Error('Location validation failed');
    } finally {
      setIsValidating(false);
    }
  }, []);

  const nextStep = useCallback(async () => {
    if (currentStep === 1) {
      try {
        await validateLocation(watchedLocation);
      } catch (error) {
        // Handle validation error
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, steps.length));
  }, [currentStep, watchedLocation, validateLocation]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  }, []);

  const onSubmit = (data: ScanConfig) => {
    onScanStart(data);
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 
                  ${isActive ? 'border-blue-500 bg-blue-500 text-white' : 
                    isCompleted ? 'border-green-500 bg-green-500 text-white' : 
                    'border-gray-300 text-gray-400'}
                `}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-blue-600' : 
                  isCompleted ? 'text-green-600' : 
                  'text-gray-400'
                }`}>
                  {step.title}
                </span>
                {step.id < steps.length && (
                  <div className={`w-16 h-0.5 mx-4 ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Location */}
        {currentStep === 1 && (
          <LocationStep
            register={register}
            errors={errors}
            scanType={watchedScanType}
            onScanTypeChange={(type) => setValue('scanType', type)}
            isValidating={isValidating}
          />
        )}

        {/* Step 2: Data Sources */}
        {currentStep === 2 && (
          <DataSourcesStep
            register={register}
            watch={watch}
            setValue={setValue}
          />
        )}

        {/* Step 3: Configuration */}
        {currentStep === 3 && (
          <ConfigurationStep
            register={register}
            errors={errors}
            watch={watch}
            setValue={setValue}
          />
        )}

        {/* Step 4: Review */}
        {currentStep === 4 && (
          <ReviewStep
            config={watch()}
          />
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Previous
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!isValid || isValidating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isValidating ? 'Validating...' : 'Next'}
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 flex items-center"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Scan
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export default ScanWizard;
```

---

This completes the first major batch of the comprehensive technical specification. The document covers:

1. **Current Platform Architecture Analysis** - Complete breakdown of the existing microservices
2. **Detailed Service Specifications** - In-depth analysis of each service with code examples
3. **Complete Feature Specifications** - Comprehensive feature documentation
4. **Database Schema Specifications** - Complete data models and relationships
5. **API Integration Specifications** - Detailed API integration patterns
6. **Frontend Component Specifications** - Advanced React component architecture

The next batches will cover:
- Security and compliance specifications
- Testing and quality assurance frameworks
- Deployment and infrastructure specifications
- Performance optimization strategies
- Business logic and workflow specifications
- Integration testing and monitoring

---

## 7. SECURITY AND COMPLIANCE SPECIFICATIONS

### 7.1 Authentication and Authorization

#### 7.1.1 Multi-Provider Authentication System
```python
# backend/app/auth/providers.py
class AuthenticationManager:
    """Centralized authentication management"""
    
    def __init__(self):
        self.providers = {
            'google': GoogleOAuthProvider(),
            'microsoft': MicrosoftOAuthProvider(),
            'apple': AppleOAuthProvider(),
            'email': EmailPasswordProvider()
        }
    
    async def authenticate_user(self, provider: str, credentials: dict):
        """Multi-provider authentication"""
        if provider not in self.providers:
            raise ValueError(f"Unsupported provider: {provider}")
        
        auth_provider = self.providers[provider]
        user_info = await auth_provider.authenticate(credentials)
        
        # Create or update user record
        user = await self.create_or_update_user(user_info, provider)
        
        # Generate JWT tokens
        access_token = self.generate_access_token(user)
        refresh_token = self.generate_refresh_token(user)
        
        return AuthResult(
            user=user,
            access_token=access_token,
            refresh_token=refresh_token,
            provider=provider
        )

class GoogleOAuthProvider(AuthProvider):
    """Google OAuth 2.0 implementation"""
    
    async def authenticate(self, credentials: dict):
        """Authenticate with Google"""
        try:
            # Verify Google ID token
            idinfo = id_token.verify_oauth2_token(
                credentials['id_token'], 
                requests.Request(), 
                settings.GOOGLE_CLIENT_ID
            )
            
            return UserInfo(
                email=idinfo['email'],
                name=idinfo['name'],
                picture=idinfo.get('picture'),
                email_verified=idinfo.get('email_verified', False),
                provider_id=idinfo['sub']
            )
        except ValueError as e:
            raise AuthenticationError(f"Google authentication failed: {e}")
```

#### 7.1.2 Role-Based Access Control (RBAC)
```python
# backend/app/auth/permissions.py
class Permission(Enum):
    # Data Access
    READ_PROPERTIES = "read:properties"
    WRITE_PROPERTIES = "write:properties"
    DELETE_PROPERTIES = "delete:properties"
    
    # Lead Management
    READ_LEADS = "read:leads"
    WRITE_LEADS = "write:leads"
    EXPORT_LEADS = "export:leads"
    
    # System Administration
    MANAGE_USERS = "manage:users"
    MANAGE_SETTINGS = "manage:settings"
    VIEW_ANALYTICS = "view:analytics"
    
    # API Access
    API_ACCESS = "api:access"
    API_ADMIN = "api:admin"

class Role(Enum):
    VIEWER = "viewer"
    USER = "user"
    PREMIUM = "premium"
    ADMIN = "admin"
    SUPERUSER = "superuser"

ROLE_PERMISSIONS = {
    Role.VIEWER: [
        Permission.READ_PROPERTIES,
        Permission.READ_LEADS
    ],
    Role.USER: [
        Permission.READ_PROPERTIES,
        Permission.READ_LEADS,
        Permission.WRITE_LEADS,
        Permission.API_ACCESS
    ],
    Role.PREMIUM: [
        Permission.READ_PROPERTIES,
        Permission.WRITE_PROPERTIES,
        Permission.READ_LEADS,
        Permission.WRITE_LEADS,
        Permission.EXPORT_LEADS,
        Permission.API_ACCESS,
        Permission.VIEW_ANALYTICS
    ],
    Role.ADMIN: [
        # All permissions except superuser-only
        perm for perm in Permission if perm not in [Permission.API_ADMIN]
    ],
    Role.SUPERUSER: list(Permission)  # All permissions
}

def require_permission(permission: Permission):
    """Decorator for permission-based access control"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract user from request context
            user = get_current_user()
            
            if not user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            if not user.has_permission(permission):
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator
```

#### 7.1.3 API Security Implementation
```python
# backend/app/security/api_security.py
class APISecurityManager:
    """Comprehensive API security implementation"""
    
    def __init__(self):
        self.rate_limiter = RedisRateLimiter()
        self.ip_blocker = IPBlocklistManager()
        self.api_key_manager = APIKeyManager()
    
    async def validate_request(self, request: Request):
        """Comprehensive request validation"""
        # IP-based blocking
        client_ip = self.get_client_ip(request)
        if await self.ip_blocker.is_blocked(client_ip):
            raise HTTPException(status_code=403, detail="IP address blocked")
        
        # Rate limiting
        rate_limit_key = f"rate_limit:{client_ip}"
        if not await self.rate_limiter.check_limit(rate_limit_key, limit=100, window=60):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
        
        # API key validation (if provided)
        api_key = request.headers.get('X-API-Key')
        if api_key:
            if not await self.api_key_manager.validate_key(api_key):
                raise HTTPException(status_code=401, detail="Invalid API key")
        
        # CORS validation
        origin = request.headers.get('Origin')
        if origin and not self.is_allowed_origin(origin):
            raise HTTPException(status_code=403, detail="Origin not allowed")
        
        return True

class DataEncryptionManager:
    """Handles sensitive data encryption"""
    
    def __init__(self):
        self.cipher_suite = Fernet(settings.ENCRYPTION_KEY)
    
    def encrypt_pii(self, data: str) -> str:
        """Encrypt personally identifiable information"""
        if not data:
            return data
        
        encrypted_data = self.cipher_suite.encrypt(data.encode())
        return base64.b64encode(encrypted_data).decode()
    
    def decrypt_pii(self, encrypted_data: str) -> str:
        """Decrypt personally identifiable information"""
        if not encrypted_data:
            return encrypted_data
        
        decoded_data = base64.b64decode(encrypted_data.encode())
        decrypted_data = self.cipher_suite.decrypt(decoded_data)
        return decrypted_data.decode()
    
    def hash_sensitive_data(self, data: str) -> str:
        """One-way hash for sensitive data"""
        salt = secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac('sha256', data.encode(), salt.encode(), 100000)
        return f"{salt}:{hashed.hex()}"
```

### 7.2 Data Privacy and GDPR Compliance

#### 7.2.1 Privacy Management System
```python
# backend/app/privacy/gdpr_manager.py
class GDPRComplianceManager:
    """GDPR compliance implementation"""
    
    def __init__(self):
        self.data_processor = DataProcessor()
        self.consent_manager = ConsentManager()
        self.retention_manager = RetentionManager()
    
    async def handle_data_subject_request(self, request_type: str, email: str):
        """Handle GDPR data subject requests"""
        user = await self.find_user_by_email(email)
        if not user:
            raise ValueError("User not found")
        
        if request_type == "access":
            return await self.export_user_data(user)
        elif request_type == "deletion":
            return await self.delete_user_data(user)
        elif request_type == "portability":
            return await self.export_portable_data(user)
        elif request_type == "rectification":
            return await self.prepare_rectification_form(user)
        else:
            raise ValueError(f"Unsupported request type: {request_type}")
    
    async def export_user_data(self, user: User) -> dict:
        """Export all user data for GDPR access request"""
        data_export = {
            "user_profile": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "created_at": user.created_at.isoformat(),
                "last_login": user.last_login.isoformat() if user.last_login else None
            },
            "search_history": await self.get_user_searches(user.id),
            "lead_interactions": await self.get_user_lead_interactions(user.id),
            "api_usage": await self.get_user_api_usage(user.id),
            "consent_records": await self.consent_manager.get_user_consents(user.id)
        }
        
        # Log the data export
        await self.log_gdpr_activity(user.id, "data_export")
        
        return data_export
    
    async def delete_user_data(self, user: User) -> bool:
        """Permanently delete user data"""
        try:
            # Anonymize instead of hard delete for audit trails
            await self.anonymize_user_data(user)
            
            # Remove PII from all related records
            await self.scrub_user_references(user.id)
            
            # Log the deletion
            await self.log_gdpr_activity(user.id, "data_deletion")
            
            return True
        except Exception as e:
            logger.error(f"Failed to delete user data: {e}")
            return False

class ConsentManager:
    """Manages user consent for data processing"""
    
    async def record_consent(self, user_id: str, consent_type: str, granted: bool):
        """Record user consent"""
        consent_record = ConsentRecord(
            user_id=user_id,
            consent_type=consent_type,
            granted=granted,
            timestamp=datetime.utcnow(),
            ip_address=get_current_ip(),
            user_agent=get_current_user_agent()
        )
        
        await self.save_consent_record(consent_record)
    
    async def check_consent(self, user_id: str, consent_type: str) -> bool:
        """Check if user has given consent for specific processing"""
        latest_consent = await self.get_latest_consent(user_id, consent_type)
        return latest_consent and latest_consent.granted
    
    async def get_consent_history(self, user_id: str) -> List[ConsentRecord]:
        """Get full consent history for user"""
        return await self.db.fetch_all(
            "SELECT * FROM consent_records WHERE user_id = $1 ORDER BY timestamp DESC",
            user_id
        )
```

#### 7.2.2 Data Retention and Anonymization
```python
# backend/app/privacy/data_retention.py
class DataRetentionManager:
    """Automated data retention and cleanup"""
    
    def __init__(self):
        self.retention_policies = {
            'user_sessions': timedelta(days=30),
            'search_logs': timedelta(days=90),
            'api_logs': timedelta(days=365),
            'lead_interactions': timedelta(days=730),
            'audit_logs': timedelta(days=2555)  # 7 years
        }
    
    async def run_retention_cleanup(self):
        """Run automated data retention cleanup"""
        for data_type, retention_period in self.retention_policies.items():
            cutoff_date = datetime.utcnow() - retention_period
            
            if data_type == 'user_sessions':
                await self.cleanup_expired_sessions(cutoff_date)
            elif data_type == 'search_logs':
                await self.cleanup_search_logs(cutoff_date)
            elif data_type == 'api_logs':
                await self.cleanup_api_logs(cutoff_date)
            elif data_type == 'lead_interactions':
                await self.anonymize_old_interactions(cutoff_date)
            # Audit logs are kept longer for compliance
    
    async def anonymize_old_interactions(self, cutoff_date: datetime):
        """Anonymize old user interactions while preserving analytics"""
        query = """
        UPDATE lead_interactions 
        SET user_id = NULL, 
            ip_address = '0.0.0.0',
            user_agent = 'anonymized',
            anonymized_at = NOW()
        WHERE created_at < $1 AND anonymized_at IS NULL
        """
        
        result = await self.db.execute(query, cutoff_date)
        logger.info(f"Anonymized {result} old lead interactions")

class DataMinimizationEngine:
    """Ensures data minimization principles"""
    
    async def minimize_stored_data(self, data: dict, purpose: str) -> dict:
        """Remove unnecessary data fields based on processing purpose"""
        minimization_rules = {
            'lead_scoring': ['address', 'property_value', 'roof_condition'],
            'contact_enrichment': ['name', 'address', 'phone'],
            'analytics': ['city', 'state', 'score', 'created_at'],
            'marketing': ['email', 'name', 'preferences']
        }
        
        allowed_fields = minimization_rules.get(purpose, [])
        return {k: v for k, v in data.items() if k in allowed_fields}
```

### 7.3 Infrastructure Security

#### 7.3.1 Container Security
```yaml
# docker-compose.security.yml
version: '3.8'

services:
  backend:
    image: fishmouth/backend:latest
    security_opt:
      - no-new-privileges:true
    user: "1000:1000"  # Non-root user
    read_only: true
    tmpfs:
      - /tmp:rw,nosuid,nodev,noexec,relatime
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    environment:
      - PYTHONDONTWRITEBYTECODE=1
      - PYTHONUNBUFFERED=1
    secrets:
      - db_password
      - jwt_secret
      - encryption_key
    networks:
      - backend_network

  database:
    image: postgres:15-alpine
    security_opt:
      - no-new-privileges:true
    user: "999:999"  # postgres user
    read_only: true
    tmpfs:
      - /tmp:rw,nosuid,nodev,noexec,relatime
      - /var/run/postgresql:rw,nosuid,nodev,noexec,relatime
    volumes:
      - db_data:/var/lib/postgresql/data:rw
    environment:
      - POSTGRES_DB_FILE=/run/secrets/db_name
      - POSTGRES_USER_FILE=/run/secrets/db_user
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_name
      - db_user
      - db_password
    networks:
      - backend_network

secrets:
  db_password:
    external: true
  db_user:
    external: true
  db_name:
    external: true
  jwt_secret:
    external: true
  encryption_key:
    external: true

networks:
  backend_network:
    driver: bridge
    internal: true
  frontend_network:
    driver: bridge

volumes:
  db_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /var/lib/docker/volumes/fishmouth_db
```

#### 7.3.2 Network Security Configuration
```nginx
# nginx/security.conf
# Security headers and configuration

# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
limit_conn_zone $binary_remote_addr zone=addr:10m;

# SSL Configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;

# Hide server information
server_tokens off;

# Prevent access to hidden files
location ~ /\. {
    deny all;
    access_log off;
    log_not_found off;
}

# API endpoint protection
location /api/ {
    limit_req zone=api burst=20 nodelay;
    limit_conn addr 10;
    
    # Proxy to backend
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Security timeouts
    proxy_connect_timeout 5s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}

# Login endpoint protection
location /api/auth/login {
    limit_req zone=login burst=5 nodelay;
    limit_conn addr 5;
    
    proxy_pass http://backend;
}
```

---

## 8. TESTING AND QUALITY ASSURANCE FRAMEWORKS

### 8.1 Comprehensive Testing Strategy

#### 8.1.1 Backend Testing Framework
```python
# backend/tests/conftest.py
import pytest
import asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from testcontainers.postgres import PostgresContainer
from testcontainers.redis import RedisContainer

from app.main import app
from app.database import get_db
from app.models import Base
from app.auth.jwt import create_access_token

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def postgres_container():
    """Start PostgreSQL container for testing"""
    with PostgresContainer("postgres:15") as postgres:
        yield postgres

@pytest.fixture(scope="session")
async def redis_container():
    """Start Redis container for testing"""
    with RedisContainer("redis:7") as redis:
        yield redis

@pytest.fixture
async def db_engine(postgres_container):
    """Create test database engine"""
    database_url = postgres_container.get_connection_url().replace("psycopg2", "asyncpg")
    engine = create_async_engine(database_url)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def db_session(db_engine):
    """Create test database session"""
    async_session = sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session

@pytest.fixture
async def test_client(db_session):
    """Create test HTTP client"""
    app.dependency_overrides[get_db] = lambda: db_session
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()

@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for test user"""
    access_token = create_access_token({"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture
async def test_user(db_session):
    """Create test user"""
    from app.models.user import User
    
    user = User(
        email="test@example.com",
        name="Test User",
        role="user",
        is_active=True
    )
    
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    return user
```

#### 8.1.2 API Testing Suite
```python
# backend/tests/test_api/test_leads.py
import pytest
from httpx import AsyncClient
from unittest.mock import Mock, patch

class TestLeadGeneration:
    """Test lead generation API endpoints"""
    
    async def test_score_lead_success(self, test_client: AsyncClient, auth_headers, test_property):
        """Test successful lead scoring"""
        response = await test_client.post(
            "/api/v1/leads/score",
            json={"property_id": str(test_property.id)},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "overall_score" in data
        assert "component_scores" in data
        assert "buying_signals" in data
        assert 0 <= data["overall_score"] <= 100
    
    async def test_score_lead_unauthorized(self, test_client: AsyncClient):
        """Test lead scoring without authentication"""
        response = await test_client.post(
            "/api/v1/leads/score",
            json={"property_id": "123e4567-e89b-12d3-a456-426614174000"}
        )
        
        assert response.status_code == 401
    
    async def test_score_lead_invalid_property(self, test_client: AsyncClient, auth_headers):
        """Test lead scoring with invalid property ID"""
        response = await test_client.post(
            "/api/v1/leads/score",
            json={"property_id": "nonexistent"},
            headers=auth_headers
        )
        
        assert response.status_code == 404
    
    @patch('app.services.lead_scorer.LeadScorer.score_property')
    async def test_score_lead_service_error(self, mock_scorer, test_client: AsyncClient, auth_headers, test_property):
        """Test lead scoring with service error"""
        mock_scorer.side_effect = Exception("Scoring service unavailable")
        
        response = await test_client.post(
            "/api/v1/leads/score",
            json={"property_id": str(test_property.id)},
            headers=auth_headers
        )
        
        assert response.status_code == 500
        assert "Scoring failed" in response.json()["detail"]
    
    async def test_batch_scoring(self, test_client: AsyncClient, auth_headers, test_properties):
        """Test batch lead scoring"""
        property_ids = [str(prop.id) for prop in test_properties[:5]]
        
        response = await test_client.post(
            "/api/v1/leads/score/batch",
            json={"property_ids": property_ids},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] is True
        assert data["scored"] <= len(property_ids)
        assert len(data["results"]) <= len(property_ids)
```

#### 8.1.3 Integration Testing Framework
```python
# backend/tests/integration/test_lead_workflow.py
import pytest
from unittest.mock import AsyncMock, patch

class TestLeadGenerationWorkflow:
    """Integration tests for complete lead generation workflow"""
    
    @pytest.mark.integration
    async def test_complete_lead_workflow(self, test_client, auth_headers, mock_external_apis):
        """Test complete lead generation workflow from scraping to scoring"""
        
        # 1. Start scraping job
        scraping_response = await test_client.post(
            "/api/v1/scraper/jobs",
            json={
                "job_type": "permit",
                "city": "Austin",
                "state": "TX",
                "urls": ["https://example.gov/permits"]
            },
            headers=auth_headers
        )
        
        assert scraping_response.status_code == 200
        job_data = scraping_response.json()
        job_id = job_data["id"]
        
        # 2. Wait for scraping to complete (simulate)
        await self.wait_for_job_completion(test_client, job_id, auth_headers)
        
        # 3. Get scraped properties
        properties_response = await test_client.get(
            f"/api/v1/properties?job_id={job_id}",
            headers=auth_headers
        )
        
        assert properties_response.status_code == 200
        properties = properties_response.json()["properties"]
        assert len(properties) > 0
        
        # 4. Start enrichment for properties
        property_id = properties[0]["id"]
        enrichment_response = await test_client.post(
            "/api/v1/enrichment/jobs",
            json={
                "source_table": "raw_properties",
                "source_id": property_id,
                "enrichment_types": ["email_lookup", "address_validation"]
            },
            headers=auth_headers
        )
        
        assert enrichment_response.status_code == 200
        
        # 5. Score the lead
        scoring_response = await test_client.post(
            "/api/v1/leads/score",
            json={"property_id": property_id},
            headers=auth_headers
        )
        
        assert scoring_response.status_code == 200
        score_data = scoring_response.json()
        assert "overall_score" in score_data
        assert score_data["overall_score"] > 0
    
    async def wait_for_job_completion(self, client, job_id, headers, timeout=30):
        """Wait for background job to complete"""
        import asyncio
        
        for _ in range(timeout):
            response = await client.get(f"/api/v1/scraper/jobs/{job_id}", headers=headers)
            if response.status_code == 200:
                job_status = response.json()["status"]
                if job_status in ["completed", "failed"]:
                    return job_status
            
            await asyncio.sleep(1)
        
        raise TimeoutError(f"Job {job_id} did not complete within {timeout} seconds")
```

### 8.2 Performance Testing Framework

#### 8.2.1 Load Testing with Locust
```python
# backend/tests/performance/test_load.py
from locust import HttpUser, task, between
import random
import json

class LeadGenerationUser(HttpUser):
    """Simulate user behavior for load testing"""
    
    wait_time = between(1, 3)
    
    def on_start(self):
        """Login and get authentication token"""
        response = self.client.post("/api/auth/login", json={
            "email": "test@example.com",
            "password": "test123"
        })
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}
    
    @task(3)
    def view_dashboard(self):
        """Load dashboard data"""
        self.client.get("/api/v1/dashboard/summary", headers=self.headers)
    
    @task(2)
    def search_properties(self):
        """Search for properties"""
        cities = ["Austin", "Dallas", "Houston", "San Antonio"]
        city = random.choice(cities)
        
        self.client.get(
            f"/api/v1/properties/search?city={city}&limit=50",
            headers=self.headers
        )
    
    @task(1)
    def score_lead(self):
        """Score a random lead"""
        # Get random property first
        response = self.client.get(
            "/api/v1/properties?limit=1&random=true",
            headers=self.headers
        )
        
        if response.status_code == 200:
            properties = response.json().get("properties", [])
            if properties:
                property_id = properties[0]["id"]
                
                self.client.post(
                    "/api/v1/leads/score",
                    json={"property_id": property_id},
                    headers=self.headers
                )
    
    @task(1)
    def create_enrichment_job(self):
        """Create enrichment job"""
        self.client.post(
            "/api/v1/enrichment/jobs",
            json={
                "source_table": "raw_properties",
                "source_id": "123e4567-e89b-12d3-a456-426614174000",
                "enrichment_types": ["email_lookup"]
            },
            headers=self.headers
        )

class AdminUser(HttpUser):
    """Simulate admin user behavior"""
    
    wait_time = between(2, 5)
    weight = 1  # Lower frequency than regular users
    
    def on_start(self):
        """Admin login"""
        response = self.client.post("/api/auth/login", json={
            "email": "admin@example.com",
            "password": "admin123"
        })
        
        if response.status_code == 200:
            self.token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(2)
    def view_analytics(self):
        """View system analytics"""
        self.client.get("/api/v1/analytics/performance", headers=self.headers)
    
    @task(1)
    def manage_users(self):
        """Manage users"""
        self.client.get("/api/v1/admin/users", headers=self.headers)
    
    @task(1)
    def system_health(self):
        """Check system health"""
        self.client.get("/api/v1/health/detailed", headers=self.headers)
```

#### 8.2.2 Database Performance Testing
```python
# backend/tests/performance/test_database.py
import pytest
import asyncio
import time
from sqlalchemy import text

class TestDatabasePerformance:
    """Database performance testing"""
    
    @pytest.mark.performance
    async def test_property_search_performance(self, db_session):
        """Test property search query performance"""
        # Insert test data
        await self.insert_test_properties(db_session, 10000)
        
        # Test query performance
        start_time = time.time()
        
        query = text("""
        SELECT p.*, ls.overall_score
        FROM raw_properties p
        LEFT JOIN lead_scores ls ON ls.property_id = p.id
        WHERE p.city ILIKE :city 
        AND p.state = :state
        ORDER BY ls.overall_score DESC NULLS LAST
        LIMIT 100
        """)
        
        result = await db_session.execute(
            query, 
            {"city": "%Austin%", "state": "TX"}
        )
        
        execution_time = time.time() - start_time
        
        # Performance assertion
        assert execution_time < 0.5, f"Query took {execution_time:.2f}s, expected < 0.5s"
        assert len(result.fetchall()) <= 100
    
    @pytest.mark.performance
    async def test_concurrent_lead_scoring(self, db_session):
        """Test concurrent lead scoring performance"""
        property_ids = await self.get_test_property_ids(db_session, 100)
        
        async def score_lead(property_id):
            from app.services.lead_scorer import LeadScorer
            scorer = LeadScorer()
            
            # Simulate scoring operation
            start_time = time.time()
            await scorer.score_property_by_id(property_id)
            return time.time() - start_time
        
        # Run concurrent scoring
        start_time = time.time()
        tasks = [score_lead(pid) for pid in property_ids[:10]]
        individual_times = await asyncio.gather(*tasks)
        total_time = time.time() - start_time
        
        # Performance assertions
        avg_time = sum(individual_times) / len(individual_times)
        assert avg_time < 2.0, f"Average scoring time {avg_time:.2f}s, expected < 2.0s"
        assert total_time < 5.0, f"Total concurrent time {total_time:.2f}s, expected < 5.0s"
    
    async def insert_test_properties(self, db_session, count: int):
        """Insert test properties for performance testing"""
        from app.models.property import RawProperty
        
        properties = []
        for i in range(count):
            prop = RawProperty(
                address=f"{1000 + i} Test St",
                city="Austin",
                state="TX",
                zip="78701",
                property_value=200000 + (i * 1000),
                year_built=1990 + (i % 30)
            )
            properties.append(prop)
        
        db_session.add_all(properties)
        await db_session.commit()
```

### 8.3 Frontend Testing Framework

#### 8.3.1 React Component Testing
```javascript
// frontend/src/components/__tests__/Dashboard.test.jsx
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

import Dashboard from '../Dashboard';
import { AuthContext } from '../../contexts/AuthContext';
import * as dashboardAPI from '../../services/api/dashboard';

// Mock API calls
vi.mock('../../services/api/dashboard');

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const TestWrapper = ({ children }) => {
  const queryClient = createTestQueryClient();
  const mockAuthValue = {
    user: { id: '1', email: 'test@example.com', role: 'user' },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders dashboard with loading state', () => {
    dashboardAPI.getDashboardSummary.mockReturnValue(
      new Promise(() => {}) // Never resolves, keeping loading state
    );

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    expect(screen.getByTestId('dashboard-skeleton')).toBeInTheDocument();
  });

  test('renders dashboard with data', async () => {
    const mockDashboardData = {
      kpis: {
        totalLeads: 1234,
        highPriorityLeads: 56,
        conversionRate: 12.5,
        revenue: 125000
      },
      leads: [
        {
          id: '1',
          address: '123 Main St',
          city: 'Austin',
          state: 'TX',
          score: 85,
          priority: 'high'
        }
      ],
      storms: [],
      recentActivity: []
    };

    dashboardAPI.getDashboardSummary.mockResolvedValue(mockDashboardData);
    dashboardAPI.getRealtimeMetrics.mockResolvedValue({});

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Lead Intelligence Dashboard')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument(); // Total leads
      expect(screen.getByText('56')).toBeInTheDocument(); // High priority
      expect(screen.getByText('12.5%')).toBeInTheDocument(); // Conversion rate
    });
  });

  test('handles API error gracefully', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    dashboardAPI.getDashboardSummary.mockRejectedValue(new Error('API Error'));

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument();
    });

    consoleError.mockRestore();
  });

  test('timeframe selector updates data', async () => {
    const mockDashboardData = { kpis: {}, leads: [], storms: [] };
    dashboardAPI.getDashboardSummary.mockResolvedValue(mockDashboardData);
    dashboardAPI.getRealtimeMetrics.mockResolvedValue({});

    render(
      <TestWrapper>
        <Dashboard />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Lead Intelligence Dashboard')).toBeInTheDocument();
    });

    // Change timeframe
    const timeframeSelect = screen.getByLabelText('Timeframe');
    fireEvent.change(timeframeSelect, { target: { value: '30d' } });

    await waitFor(() => {
      expect(dashboardAPI.getDashboardSummary).toHaveBeenCalledWith('30d', 'all');
    });
  });
});
```

#### 8.3.2 End-to-End Testing with Playwright
```javascript
// frontend/tests/e2e/lead-generation.spec.js
import { test, expect } from '@playwright/test';

test.describe('Lead Generation Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'test123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await expect(page.locator('h1')).toContainText('Lead Intelligence Dashboard');
  });

  test('can create new scan job', async ({ page }) => {
    // Navigate to scan page
    await page.click('[data-testid="scan-nav-link"]');
    await expect(page).toHaveURL('/scan');

    // Fill scan form
    await page.selectOption('[data-testid="scan-type-select"]', 'city');
    await page.fill('[data-testid="city-input"]', 'Austin');
    await page.selectOption('[data-testid="state-select"]', 'TX');
    
    // Configure options
    await page.check('[data-testid="include-permits"]');
    await page.check('[data-testid="include-properties"]');
    await page.fill('[data-testid="max-results"]', '500');

    // Start scan
    await page.click('[data-testid="start-scan-button"]');

    // Verify scan started
    await expect(page.locator('[data-testid="scan-status"]')).toContainText('Scan Started');
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();
  });

  test('can view and score leads', async ({ page }) => {
    // Navigate to leads
    await page.click('[data-testid="leads-tab"]');
    
    // Wait for leads to load
    await page.waitForSelector('[data-testid="lead-list"]');
    
    // Click on first lead
    const firstLead = page.locator('[data-testid="lead-item"]').first();
    await firstLead.click();
    
    // Verify lead details modal
    await expect(page.locator('[data-testid="lead-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="lead-score"]')).toBeVisible();
    
    // Test scoring action
    await page.click('[data-testid="rescore-button"]');
    await expect(page.locator('[data-testid="scoring-spinner"]')).toBeVisible();
    
    // Wait for new score
    await page.waitForSelector('[data-testid="updated-score"]');
  });

  test('can export leads', async ({ page }) => {
    // Navigate to leads
    await page.click('[data-testid="leads-tab"]');
    
    // Select multiple leads
    await page.check('[data-testid="select-all-leads"]');
    
    // Export leads
    await page.click('[data-testid="export-button"]');
    await page.selectOption('[data-testid="export-format"]', 'csv');
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-button"]');
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/leads.*\.csv$/);
  });

  test('map interaction shows lead details', async ({ page }) => {
    // Wait for map to load
    await page.waitForSelector('[data-testid="lead-map"]');
    
    // Click on a lead marker
    await page.click('[data-testid="lead-marker"]');
    
    // Verify popup appears
    await expect(page.locator('[data-testid="lead-popup"]')).toBeVisible();
    await expect(page.locator('[data-testid="lead-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="lead-score-badge"]')).toBeVisible();
    
    // Click "View Details" in popup
    await page.click('[data-testid="view-details-button"]');
    
    // Verify full lead modal opens
    await expect(page.locator('[data-testid="lead-modal"]')).toBeVisible();
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('dashboard is mobile friendly', async ({ page }) => {
    await page.goto('/login');
    
    // Mobile login
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'test123');
    await page.click('[data-testid="login-button"]');
    
    // Check mobile dashboard layout
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    await expect(page.locator('[data-testid="kpi-cards"]')).toBeVisible();
    
    // Test mobile navigation
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });
});
```

---

## 9. DEPLOYMENT AND INFRASTRUCTURE SPECIFICATIONS

### 9.1 Container Orchestration

#### 9.1.1 Production Docker Compose Configuration
```yaml
# docker-compose.production.yml
version: '3.8'

services:
  # Frontend - React Application
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.production
    image: fishmouth/frontend:${VERSION:-latest}
    container_name: fishmouth_frontend
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=${API_URL}
      - REACT_APP_MAPBOX_TOKEN=${MAPBOX_TOKEN}
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    networks:
      - frontend_network
      - backend_network
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  # Backend - FastAPI Application
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.production
    image: fishmouth/backend:${VERSION:-latest}
    container_name: fishmouth_backend
    restart: unless-stopped
    environment:
      - ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    ports:
      - "8000:8000"
    depends_on:
      - database
      - redis
    networks:
      - backend_network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

  # Database - PostgreSQL with PostGIS
  database:
    image: postgis/postgis:15-3.3-alpine
    container_name: fishmouth_database
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - PGDATA=/var/lib/postgresql/data/pgdata
    volumes:
      - db_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d:ro
      - ./database/backups:/backups
    ports:
      - "5432:5432"
    networks:
      - backend_network
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=256MB
      -c effective_cache_size=1GB
      -c work_mem=4MB
      -c maintenance_work_mem=64MB
      -c random_page_cost=1.1
      -c temp_file_limit=2GB
      -c log_min_duration_statement=1000
      -c log_statement=mod
      -c log_checkpoints=on
      -c log_connections=on
      -c log_disconnections=on
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G

  # Redis - Caching and Session Storage
  redis:
    image: redis:7-alpine
    container_name: fishmouth_redis
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --maxmemory 512mb
      --maxmemory-policy allkeys-lru
      --save 900 1
      --save 300 10
      --save 60 10000
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf:ro
    ports:
      - "6379:6379"
    networks:
      - backend_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M

  # Microservices
  orchestrator:
    build:
      context: ./services/orchestrator
      dockerfile: Dockerfile
    image: fishmouth/orchestrator:${VERSION:-latest}
    container_name: fishmouth_orchestrator
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - database
      - redis
    networks:
      - backend_network
    ports:
      - "8001:8001"
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  image-processor:
    build:
      context: ./services/image-processor
      dockerfile: Dockerfile
    image: fishmouth/image-processor:${VERSION:-latest}
    container_name: fishmouth_image_processor
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ./models:/app/models:ro
      - ./temp:/app/temp
    depends_on:
      - database
      - redis
    networks:
      - backend_network
    ports:
      - "8002:8002"
    deploy:
      resources:
        limits:
          cpus: '4.0'  # CPU intensive for AI models
          memory: 4G
        reservations:
          cpus: '2.0'
          memory: 2G

  ml-inference:
    build:
      context: ./services/ml-inference
      dockerfile: Dockerfile
    image: fishmouth/ml-inference:${VERSION:-latest}
    container_name: fishmouth_ml_inference
    restart: unless-stopped
    environment:
      - OLLAMA_HOST=${OLLAMA_HOST}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    volumes:
      - ./models:/app/models:ro
    networks:
      - backend_network
    ports:
      - "8003:8003"
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G

  enrichment-service:
    build:
      context: ./services/enrichment-service
      dockerfile: Dockerfile
    image: fishmouth/enrichment-service:${VERSION:-latest}
    container_name: fishmouth_enrichment
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - BUSTER_API_KEY=${BUSTER_API_KEY}
      - MAILSLEUTH_API_KEY=${MAILSLEUTH_API_KEY}
    depends_on:
      - database
      - redis
    networks:
      - backend_network
    ports:
      - "8004:8004"
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  lead-generator:
    build:
      context: ./services/lead-generator
      dockerfile: Dockerfile
    image: fishmouth/lead-generator:${VERSION:-latest}
    container_name: fishmouth_lead_generator
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - database
      - redis
    networks:
      - backend_network
    ports:
      - "8008:8008"
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  scraper-service:
    build:
      context: ./services/scraper-service
      dockerfile: Dockerfile
    image: fishmouth/scraper-service:${VERSION:-latest}
    container_name: fishmouth_scraper
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - OLLAMA_HOST=${OLLAMA_HOST}
    depends_on:
      - database
      - redis
    networks:
      - backend_network
    ports:
      - "8011:8011"
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G

  # Monitoring and Observability
  prometheus:
    image: prom/prometheus:latest
    container_name: fishmouth_prometheus
    restart: unless-stopped
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=90d'
      - '--web.enable-lifecycle'
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - monitoring_network
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G

  grafana:
    image: grafana/grafana:latest
    container_name: fishmouth_grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
    networks:
      - monitoring_network
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M

networks:
  frontend_network:
    driver: bridge
  backend_network:
    driver: bridge
    internal: true
  monitoring_network:
    driver: bridge

volumes:
  db_data:
    driver: local
  redis_data:
    driver: local
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
```

#### 9.1.2 Kubernetes Deployment Configuration
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: fishmouth
  labels:
    name: fishmouth
    environment: production

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fishmouth-config
  namespace: fishmouth
data:
  NODE_ENV: "production"
  ENV: "production"
  LOG_LEVEL: "info"
  API_URL: "https://api.fishmouth.com"

---
# k8s/secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: fishmouth-secrets
  namespace: fishmouth
type: Opaque
stringData:
  DATABASE_URL: "postgresql://fishmouth:password@postgres:5432/fishmouth"
  REDIS_URL: "redis://redis:6379/0"
  JWT_SECRET: "your-jwt-secret-here"
  ENCRYPTION_KEY: "your-encryption-key-here"
  OPENROUTER_API_KEY: "your-openrouter-key"

---
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: fishmouth
  labels:
    app: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: fishmouth/backend:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: fishmouth-secrets
              key: DATABASE_URL
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: fishmouth-secrets
              key: REDIS_URL
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: fishmouth-secrets
              key: JWT_SECRET
        envFrom:
        - configMapRef:
            name: fishmouth-config
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readyz
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
      imagePullSecrets:
      - name: docker-registry-secret

---
# k8s/backend-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: fishmouth
spec:
  selector:
    app: backend
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
  type: ClusterIP

---
# k8s/backend-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: fishmouth
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80

---
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: fishmouth-ingress
  namespace: fishmouth
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - fishmouth.com
    - api.fishmouth.com
    secretName: fishmouth-tls
  rules:
  - host: fishmouth.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-service
            port:
              number: 80
  - host: api.fishmouth.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 8000
```

### 9.2 Infrastructure as Code with Terraform

#### 9.2.1 AWS Infrastructure Configuration
```hcl
# terraform/main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "fishmouth-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Fishmouth"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# VPC Configuration
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "fishmouth-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "fishmouth-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 1}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]
  
  map_public_ip_on_launch = true

  tags = {
    Name = "fishmouth-public-subnet-${count.index + 1}"
    Type = "Public"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.${count.index + 10}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "fishmouth-private-subnet-${count.index + 1}"
    Type = "Private"
  }
}

# NAT Gateways
resource "aws_eip" "nat" {
  count  = 2
  domain = "vpc"

  tags = {
    Name = "fishmouth-nat-eip-${count.index + 1}"
  }
}

resource "aws_nat_gateway" "main" {
  count         = 2
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "fishmouth-nat-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "fishmouth-public-rt"
  }
}

resource "aws_route_table" "private" {
  count  = 2
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "fishmouth-private-rt-${count.index + 1}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = 2
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = 2
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "fishmouth-cluster"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = ["0.0.0.0/0"]
  }

  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_vpc_resource_controller,
  ]

  tags = {
    Name = "fishmouth-eks-cluster"
  }
}

# EKS Node Groups
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "fishmouth-nodes"
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = aws_subnet.private[*].id
  
  instance_types = ["t3.medium", "t3.large"]
  capacity_type  = "SPOT"

  scaling_config {
    desired_size = 3
    max_size     = 10
    min_size     = 1
  }

  update_config {
    max_unavailable_percentage = 25
  }

  # Ensure that IAM Role permissions are created before and deleted after EKS Node Group handling.
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_container_registry_policy,
  ]

  tags = {
    Name = "fishmouth-eks-nodes"
  }
}

# RDS PostgreSQL Database
resource "aws_db_subnet_group" "main" {
  name       = "fishmouth-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "fishmouth-db-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier = "fishmouth-postgres"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds.arn
  
  db_name  = "fishmouth"
  username = "fishmouth"
  password = var.db_password
  
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "fishmouth-postgres-final-snapshot"
  
  performance_insights_enabled = true
  monitoring_interval         = 60
  monitoring_role_arn        = aws_iam_role.rds_monitoring.arn
  
  tags = {
    Name = "fishmouth-postgres"
  }
}

# ElastiCache Redis Cluster
resource "aws_elasticache_subnet_group" "main" {
  name       = "fishmouth-cache-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id       = "fishmouth-redis"
  description                = "Redis cluster for Fishmouth"
  
  node_type                  = "cache.t3.micro"
  port                       = 6379
  parameter_group_name       = "default.redis7"
  
  num_cache_clusters         = 2
  automatic_failover_enabled = true
  multi_az_enabled          = true
  
  subnet_group_name = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                = var.redis_auth_token
  
  snapshot_retention_limit = 5
  snapshot_window         = "03:00-05:00"
  
  tags = {
    Name = "fishmouth-redis"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "fishmouth-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = false

  tags = {
    Name = "fishmouth-alb"
  }
}

# S3 Buckets
resource "aws_s3_bucket" "assets" {
  bucket = "fishmouth-assets-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "fishmouth-assets"
  }
}

resource "aws_s3_bucket" "backups" {
  bucket = "fishmouth-backups-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "fishmouth-backups"
  }
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "fishmouth-alb"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  aliases = ["fishmouth.com", "www.fishmouth.com"]

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "fishmouth-alb"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  price_class = "PriceClass_100"

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.main.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = {
    Name = "fishmouth-cloudfront"
  }
}
```

#### 9.2.2 Security Groups and IAM Policies
```hcl
# terraform/security.tf

# KMS Keys
resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key"
  deletion_window_in_days = 7

  tags = {
    Name = "fishmouth-eks-key"
  }
}

resource "aws_kms_key" "rds" {
  description             = "RDS Encryption Key"
  deletion_window_in_days = 7

  tags = {
    Name = "fishmouth-rds-key"
  }
}

# Security Groups
resource "aws_security_group" "eks_cluster" {
  name_prefix = "fishmouth-eks-cluster-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "fishmouth-eks-cluster-sg"
  }
}

resource "aws_security_group" "eks_nodes" {
  name_prefix = "fishmouth-eks-nodes-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }

  ingress {
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "fishmouth-eks-nodes-sg"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "fishmouth-rds-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "fishmouth-rds-sg"
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "fishmouth-redis-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = {
    Name = "fishmouth-redis-sg"
  }
}

resource "aws_security_group" "alb" {
  name_prefix = "fishmouth-alb-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "fishmouth-alb-sg"
  }
}

# IAM Roles and Policies
resource "aws_iam_role" "eks_cluster" {
  name = "fishmouth-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role" "eks_node_group" {
  name = "fishmouth-eks-node-group-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_group.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_group.name
}

# RDS Monitoring Role
resource "aws_iam_role" "rds_monitoring" {
  name = "fishmouth-rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
  role       = aws_iam_role.rds_monitoring.name
}

# SSL Certificate
resource "aws_acm_certificate" "main" {
  domain_name               = "fishmouth.com"
  subject_alternative_names = ["*.fishmouth.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "fishmouth-ssl-cert"
  }
}
```

### 9.3 CI/CD Pipeline Configuration

#### 9.3.1 GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: Fishmouth CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Testing Jobs
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_fishmouth
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
        cache: 'pip'
    
    - name: Install dependencies
      run: |
        cd backend
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Run tests
      env:
        DATABASE_URL: postgresql://test_user:test_password@localhost:5432/test_fishmouth
        REDIS_URL: redis://localhost:6379/0
        JWT_SECRET: test-secret
        ENCRYPTION_KEY: test-encryption-key
      run: |
        cd backend
        pytest tests/ -v --cov=app --cov-report=xml --cov-report=term-missing
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./backend/coverage.xml
        flags: backend

  test-frontend:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run tests
      run: |
        cd frontend
        npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./frontend/coverage/lcov.info
        flags: frontend

  # Security Scanning
  security-scan:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Run Trivy vulnerability scanner
      uses: aquasecurity/trivy-action@master
      with:
        scan-type: 'fs'
        scan-ref: '.'
        format: 'sarif'
        output: 'trivy-results.sarif'
    
    - name: Upload Trivy scan results to GitHub Security tab
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: 'trivy-results.sarif'

  # Performance Testing
  performance-test:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    needs: [test-backend, test-frontend]
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install Locust
      run: pip install locust
    
    - name: Run performance tests
      run: |
        cd backend/tests/performance
        locust --headless -u 50 -r 10 -t 300s --host=http://localhost:8000

  # Build and Push Images
  build-and-push:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend, security-scan]
    if: github.ref == 'refs/heads/main'
    
    strategy:
      matrix:
        component: [backend, frontend, orchestrator, image-processor, ml-inference, enrichment-service, lead-generator, scraper-service]
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v3
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/${{ matrix.component }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix={{branch}}-
          type=raw,value=latest,enable={{is_default_branch}}
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v5
      with:
        context: ./${{ matrix.component }}
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max

  # Deploy to Staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    environment: staging
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Update kubeconfig
      run: aws eks update-kubeconfig --name fishmouth-staging-cluster
    
    - name: Deploy to staging
      run: |
        kubectl set image deployment/backend backend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:${{ github.sha }} -n fishmouth-staging
        kubectl set image deployment/frontend frontend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:${{ github.sha }} -n fishmouth-staging
        kubectl rollout status deployment/backend -n fishmouth-staging
        kubectl rollout status deployment/frontend -n fishmouth-staging

  # Deploy to Production
  deploy-production:
    runs-on: ubuntu-latest
    needs: [build-and-push, performance-test]
    if: github.ref == 'refs/heads/main'
    environment: production
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Update kubeconfig
      run: aws eks update-kubeconfig --name fishmouth-cluster
    
    - name: Deploy to production
      run: |
        kubectl set image deployment/backend backend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:${{ github.sha }} -n fishmouth
        kubectl set image deployment/frontend frontend=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:${{ github.sha }} -n fishmouth
        kubectl rollout status deployment/backend -n fishmouth
        kubectl rollout status deployment/frontend -n fishmouth
    
    - name: Run smoke tests
      run: |
        # Wait for deployment to be ready
        sleep 30
        
        # Run basic health checks
        kubectl exec -n fishmouth deployment/backend -- curl -f http://localhost:8000/healthz
        
        # Test critical endpoints
        curl -f https://api.fishmouth.com/healthz
        curl -f https://fishmouth.com

  # Database Migration
  migrate-database:
    runs-on: ubuntu-latest
    needs: deploy-production
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Update kubeconfig
      run: aws eks update-kubeconfig --name fishmouth-cluster
    
    - name: Run database migrations
      run: |
        kubectl create job migration-${{ github.sha }} \
          --from=cronjob/database-migration -n fishmouth
        
        # Wait for migration to complete
        kubectl wait --for=condition=complete --timeout=300s job/migration-${{ github.sha }} -n fishmouth

  # Post-deployment monitoring
  post-deployment-check:
    runs-on: ubuntu-latest
    needs: [deploy-production, migrate-database]
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Check application health
      run: |
        # Check main application endpoints
        for endpoint in "https://fishmouth.com/healthz" "https://api.fishmouth.com/healthz"; do
          echo "Checking $endpoint"
          response=$(curl -s -o /dev/null -w "%{http_code}" "$endpoint")
          if [ "$response" != "200" ]; then
            echo "Health check failed for $endpoint (HTTP $response)"
            exit 1
          fi
        done
        
        echo "All health checks passed!"
    
    - name: Send deployment notification
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        channel: '#deployments'
        text: |
          Fishmouth deployment to production completed successfully!
          Version: ${{ github.sha }}
          Branch: ${{ github.ref }}
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
      if: always()
```

---

## 10. MONITORING AND OBSERVABILITY SPECIFICATIONS

### 10.1 Prometheus Monitoring Configuration

#### 10.1.1 Prometheus Configuration
```yaml
# monitoring/prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'fishmouth-production'
    environment: 'production'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "/etc/prometheus/rules/*.yml"

scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Application services
  - job_name: 'fishmouth-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['backend:8000']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'backend'

  - job_name: 'fishmouth-orchestrator'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['orchestrator:8001']

  - job_name: 'fishmouth-image-processor'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['image-processor:8002']

  - job_name: 'fishmouth-ml-inference'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['ml-inference:8003']

  - job_name: 'fishmouth-enrichment'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['enrichment-service:8004']

  - job_name: 'fishmouth-lead-generator'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['lead-generator:8008']

  - job_name: 'fishmouth-scraper'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['scraper-service:8011']

  # Infrastructure services
  - job_name: 'postgres-exporter'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'redis-exporter'
    static_configs:
      - targets: ['redis-exporter:9121']

  # Node exporter for system metrics
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # Kubernetes monitoring
  - job_name: 'kubernetes-apiservers'
    kubernetes_sd_configs:
      - role: endpoints
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - source_labels: [__meta_kubernetes_namespace, __meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
        action: keep
        regex: default;kubernetes;https

  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    scheme: https
    tls_config:
      ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
      - target_label: __address__
        replacement: kubernetes.default.svc:443
      - source_labels: [__meta_kubernetes_node_name]
        regex: (.+)
        target_label: __metrics_path__
        replacement: /api/v1/nodes/${1}/proxy/metrics

  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: kubernetes_namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: kubernetes_pod_name
```

#### 10.1.2 Custom Application Metrics
```python
# backend/app/monitoring/metrics.py
from prometheus_client import Counter, Histogram, Gauge, Info
import time
from functools import wraps

# Request metrics
REQUEST_COUNT = Counter(
    'fishmouth_http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status_code']
)

REQUEST_DURATION = Histogram(
    'fishmouth_http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint']
)

# Business metrics
LEADS_PROCESSED = Counter(
    'fishmouth_leads_processed_total',
    'Total leads processed',
    ['status']  # success, failed
)

LEAD_SCORE_HISTOGRAM = Histogram(
    'fishmouth_lead_scores',
    'Distribution of lead scores',
    buckets=[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
)

PROPERTIES_SCRAPED = Counter(
    'fishmouth_properties_scraped_total',
    'Total properties scraped',
    ['source', 'status']
)

ENRICHMENT_JOBS = Counter(
    'fishmouth_enrichment_jobs_total',
    'Total enrichment jobs',
    ['type', 'status']
)

API_COSTS = Counter(
    'fishmouth_api_costs_total',
    'Total API costs in USD',
    ['provider']
)

# System metrics
ACTIVE_USERS = Gauge(
    'fishmouth_active_users',
    'Number of active users'
)

QUEUE_SIZE = Gauge(
    'fishmouth_queue_size',
    'Current queue size',
    ['queue_name']
)

DATABASE_CONNECTIONS = Gauge(
    'fishmouth_database_connections',
    'Number of database connections'
)

# Application info
APPLICATION_INFO = Info(
    'fishmouth_application_info',
    'Application information'
)

def track_request_metrics(func):
    """Decorator to track HTTP request metrics"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        method = 'unknown'
        endpoint = 'unknown'
        status_code = 500
        
        try:
            # Extract request info from FastAPI
            if hasattr(args[0], 'method'):
                method = args[0].method
                endpoint = args[0].url.path
            
            result = await func(*args, **kwargs)
            status_code = getattr(result, 'status_code', 200)
            return result
            
        except Exception as e:
            status_code = getattr(e, 'status_code', 500)
            raise
            
        finally:
            duration = time.time() - start_time
            REQUEST_COUNT.labels(
                method=method,
                endpoint=endpoint,
                status_code=status_code
            ).inc()
            REQUEST_DURATION.labels(
                method=method,
                endpoint=endpoint
            ).observe(duration)
    
    return wrapper

def track_lead_processing(status: str):
    """Track lead processing metrics"""
    LEADS_PROCESSED.labels(status=status).inc()

def track_lead_score(score: int):
    """Track lead score distribution"""
    LEAD_SCORE_HISTOGRAM.observe(score)

def track_api_cost(provider: str, cost: float):
    """Track API usage costs"""
    API_COSTS.labels(provider=provider).inc(cost)

def update_system_metrics():
    """Update system-level metrics"""
    # This would be called periodically to update gauges
    pass

# Application startup metrics initialization
def init_application_metrics():
    """Initialize application metrics"""
    APPLICATION_INFO.info({
        'version': '1.0.0',
        'environment': 'production',
        'build_date': '2024-01-15',
        'git_commit': 'abc123def'
    })
```

#### 10.1.3 Alert Rules Configuration
```yaml
# monitoring/prometheus/rules/fishmouth-alerts.yml
groups:
  - name: fishmouth.application
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: |
          (
            rate(fishmouth_http_requests_total{status_code=~"5.."}[5m]) /
            rate(fishmouth_http_requests_total[5m])
          ) > 0.05
        for: 5m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes"

      # High response time
      - alert: HighResponseTime
        expr: |
          histogram_quantile(0.95, 
            rate(fishmouth_http_request_duration_seconds_bucket[5m])
          ) > 2.0
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High response time detected"
          description: "95th percentile response time is {{ $value }}s"

      # Lead processing failure
      - alert: LeadProcessingFailure
        expr: |
          (
            rate(fishmouth_leads_processed_total{status="failed"}[10m]) /
            rate(fishmouth_leads_processed_total[10m])
          ) > 0.10
        for: 5m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High lead processing failure rate"
          description: "{{ $value | humanizePercentage }} of leads are failing to process"

      # API cost threshold
      - alert: HighAPICosts
        expr: |
          increase(fishmouth_api_costs_total[1h]) > 100
        for: 0m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "High API costs detected"
          description: "API costs have exceeded $100 in the last hour"

      # Queue backup
      - alert: QueueBackup
        expr: fishmouth_queue_size > 1000
        for: 10m
        labels:
          severity: warning
          team: backend
        annotations:
          summary: "Queue is backing up"
          description: "Queue {{ $labels.queue_name }} has {{ $value }} items"

  - name: fishmouth.infrastructure
    rules:
      # Database connection issues
      - alert: DatabaseConnectionHigh
        expr: fishmouth_database_connections > 180
        for: 5m
        labels:
          severity: warning
          team: infrastructure
        annotations:
          summary: "High database connection count"
          description: "Database has {{ $value }} active connections"

      # Redis memory usage
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Redis memory usage is high"
          description: "Redis memory usage is {{ $value | humanizePercentage }}"

      # Disk space
      - alert: DiskSpaceLow
        expr: |
          (
            node_filesystem_avail_bytes{mountpoint="/"} /
            node_filesystem_size_bytes{mountpoint="/"}
          ) < 0.1
        for: 5m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Low disk space"
          description: "Disk space is {{ $value | humanizePercentage }} full"

      # Service down
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
          team: infrastructure
        annotations:
          summary: "Service is down"
          description: "Service {{ $labels.job }} is down"

  - name: fishmouth.business
    rules:
      # Low lead generation
      - alert: LowLeadGeneration
        expr: |
          rate(fishmouth_leads_processed_total{status="success"}[1h]) < 10
        for: 30m
        labels:
          severity: warning
          team: business
        annotations:
          summary: "Low lead generation rate"
          description: "Only {{ $value }} leads generated in the last hour"

      # Lead quality drop
      - alert: LeadQualityDrop
        expr: |
          (
            histogram_quantile(0.5, 
              rate(fishmouth_lead_scores_bucket[1h])
            )
          ) < 50
        for: 30m
        labels:
          severity: warning
          team: business
        annotations:
          summary: "Lead quality has dropped"
          description: "Median lead score is {{ $value }}"
```

### 10.2 Grafana Dashboard Configuration

#### 10.2.1 Application Performance Dashboard
```json
{
  "dashboard": {
    "id": null,
    "title": "Fishmouth - Application Performance",
    "tags": ["fishmouth", "performance"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(fishmouth_http_requests_total[5m]))",
            "legendFormat": "Requests/sec"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps",
            "min": 0
          }
        },
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Error Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(rate(fishmouth_http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(fishmouth_http_requests_total[5m]))",
            "legendFormat": "Error Rate"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "percentunit",
            "min": 0,
            "max": 1,
            "thresholds": {
              "steps": [
                {"color": "green", "value": 0},
                {"color": "yellow", "value": 0.01},
                {"color": "red", "value": 0.05}
              ]
            }
          }
        },
        "gridPos": {"h": 4, "w": 6, "x": 6, "y": 0}
      },
      {
        "id": 3,
        "title": "Response Time",
        "type": "stat",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(fishmouth_http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "95th percentile"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "s",
            "min": 0,
            "thresholds": {
              "steps": [
                {"color": "green", "value": 0},
                {"color": "yellow", "value": 1},
                {"color": "red", "value": 2}
              ]
            }
          }
        },
        "gridPos": {"h": 4, "w": 6, "x": 12, "y": 0}
      },
      {
        "id": 4,
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "fishmouth_active_users",
            "legendFormat": "Active Users"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "min": 0
          }
        },
        "gridPos": {"h": 4, "w": 6, "x": 18, "y": 0}
      },
      {
        "id": 5,
        "title": "Request Rate by Endpoint",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(fishmouth_http_requests_total[5m])) by (endpoint)",
            "legendFormat": "{{ endpoint }}"
          }
        ],
        "yAxes": [
          {
            "label": "Requests/sec",
            "min": 0
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4}
      },
      {
        "id": 6,
        "title": "Response Time Distribution",
        "type": "heatmap",
        "targets": [
          {
            "expr": "sum(rate(fishmouth_http_request_duration_seconds_bucket[5m])) by (le)",
            "format": "heatmap"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 4}
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "30s"
  }
}
```

#### 10.2.2 Business Metrics Dashboard
```json
{
  "dashboard": {
    "id": null,
    "title": "Fishmouth - Business Metrics",
    "tags": ["fishmouth", "business"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Leads Processed Today",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(fishmouth_leads_processed_total{status=\"success\"}[24h])",
            "legendFormat": "Successful Leads"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "min": 0
          }
        },
        "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0}
      },
      {
        "id": 2,
        "title": "Lead Quality Score",
        "type": "gauge",
        "targets": [
          {
            "expr": "histogram_quantile(0.5, rate(fishmouth_lead_scores_bucket[1h]))",
            "legendFormat": "Median Score"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "min": 0,
            "max": 100,
            "thresholds": {
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 50},
                {"color": "green", "value": 70}
              ]
            }
          }
        },
        "gridPos": {"h": 4, "w": 6, "x": 6, "y": 0}
      },
      {
        "id": 3,
        "title": "API Costs Today",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(fishmouth_api_costs_total[24h])",
            "legendFormat": "Total Cost"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "currencyUSD",
            "min": 0
          }
        },
        "gridPos": {"h": 4, "w": 6, "x": 12, "y": 0}
      },
      {
        "id": 4,
        "title": "Properties Scraped",
        "type": "stat",
        "targets": [
          {
            "expr": "increase(fishmouth_properties_scraped_total{status=\"success\"}[24h])",
            "legendFormat": "Properties"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "short",
            "min": 0
          }
        },
        "gridPos": {"h": 4, "w": 6, "x": 18, "y": 0}
      },
      {
        "id": 5,
        "title": "Lead Processing Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(fishmouth_leads_processed_total{status=\"success\"}[5m])",
            "legendFormat": "Success Rate"
          },
          {
            "expr": "rate(fishmouth_leads_processed_total{status=\"failed\"}[5m])",
            "legendFormat": "Failure Rate"
          }
        ],
        "yAxes": [
          {
            "label": "Leads/sec",
            "min": 0
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4}
      },
      {
        "id": 6,
        "title": "Lead Score Distribution",
        "type": "histogram",
        "targets": [
          {
            "expr": "rate(fishmouth_lead_scores_bucket[5m])",
            "legendFormat": "Score: {{ le }}"
          }
        ],
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 4}
      }
    ],
    "time": {
      "from": "now-24h",
      "to": "now"
    },
    "refresh": "1m"
  }
}
```

---

## 11. BUSINESS LOGIC AND WORKFLOW SPECIFICATIONS

### 11.1 Core Business Workflows

#### 11.1.1 Lead Generation Workflow
```python
# backend/app/workflows/lead_generation.py
from typing import List, Dict, Any
from dataclasses import dataclass
from enum import Enum
import asyncio

class WorkflowStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"

class WorkflowStage(Enum):
    DATA_COLLECTION = "data_collection"
    ENRICHMENT = "enrichment"
    IMAGE_ANALYSIS = "image_analysis"
    LEAD_SCORING = "lead_scoring"
    QUALITY_VALIDATION = "quality_validation"
    DELIVERY = "delivery"

@dataclass
class WorkflowConfiguration:
    """Configuration for lead generation workflow"""
    city: str
    state: str
    data_sources: List[str]  # permits, properties, contractors
    enrichment_types: List[str]  # email_lookup, phone_lookup, address_validation
    quality_threshold: int = 70
    max_leads: int = 1000
    priority: str = "normal"  # low, normal, high, urgent
    client_id: str = None
    delivery_format: str = "api"  # api, email, webhook
    
class LeadGenerationWorkflow:
    """Complete lead generation workflow orchestrator"""
    
    def __init__(self, config: WorkflowConfiguration):
        self.config = config
        self.status = WorkflowStatus.PENDING
        self.current_stage = None
        self.progress = {}
        self.results = {}
        self.errors = []
        
    async def execute(self) -> Dict[str, Any]:
        """Execute the complete lead generation workflow"""
        try:
            self.status = WorkflowStatus.RUNNING
            
            # Stage 1: Data Collection
            await self._execute_stage(WorkflowStage.DATA_COLLECTION)
            
            # Stage 2: Data Enrichment
            await self._execute_stage(WorkflowStage.ENRICHMENT)
            
            # Stage 3: Image Analysis
            await self._execute_stage(WorkflowStage.IMAGE_ANALYSIS)
            
            # Stage 4: Lead Scoring
            await self._execute_stage(WorkflowStage.LEAD_SCORING)
            
            # Stage 5: Quality Validation
            await self._execute_stage(WorkflowStage.QUALITY_VALIDATION)
            
            # Stage 6: Delivery
            await self._execute_stage(WorkflowStage.DELIVERY)
            
            self.status = WorkflowStatus.COMPLETED
            return self._generate_workflow_report()
            
        except Exception as e:
            self.status = WorkflowStatus.FAILED
            self.errors.append(str(e))
            raise WorkflowExecutionError(f"Workflow failed: {e}")
    
    async def _execute_stage(self, stage: WorkflowStage):
        """Execute a specific workflow stage"""
        self.current_stage = stage
        self.progress[stage.value] = {"status": "running", "started_at": datetime.utcnow()}
        
        try:
            if stage == WorkflowStage.DATA_COLLECTION:
                await self._collect_data()
            elif stage == WorkflowStage.ENRICHMENT:
                await self._enrich_data()
            elif stage == WorkflowStage.IMAGE_ANALYSIS:
                await self._analyze_images()
            elif stage == WorkflowStage.LEAD_SCORING:
                await self._score_leads()
            elif stage == WorkflowStage.QUALITY_VALIDATION:
                await self._validate_quality()
            elif stage == WorkflowStage.DELIVERY:
                await self._deliver_leads()
            
            self.progress[stage.value]["status"] = "completed"
            self.progress[stage.value]["completed_at"] = datetime.utcnow()
            
        except Exception as e:
            self.progress[stage.value]["status"] = "failed"
            self.progress[stage.value]["error"] = str(e)
            raise
    
    async def _collect_data(self):
        """Stage 1: Collect raw data from various sources"""
        collection_tasks = []
        
        if "permits" in self.config.data_sources:
            collection_tasks.append(self._collect_permits())
        
        if "properties" in self.config.data_sources:
            collection_tasks.append(self._collect_properties())
        
        if "contractors" in self.config.data_sources:
            collection_tasks.append(self._collect_contractors())
        
        # Execute collection tasks concurrently
        results = await asyncio.gather(*collection_tasks, return_exceptions=True)
        
        # Process results
        total_records = 0
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Data collection failed for source {i}: {result}")
            else:
                total_records += result.get('records_collected', 0)
        
        self.results['data_collection'] = {
            'total_records': total_records,
            'sources_processed': len([r for r in results if not isinstance(r, Exception)])
        }
    
    async def _collect_permits(self) -> Dict[str, Any]:
        """Collect permit data"""
        scraper_client = ScraperServiceClient()
        
        # Get permit URLs for the city/state
        permit_urls = await self._get_permit_urls(self.config.city, self.config.state)
        
        # Create scraping job
        job_result = await scraper_client.create_job({
            "job_type": "permit",
            "city": self.config.city,
            "state": self.config.state,
            "urls": permit_urls
        })
        
        # Wait for completion
        job_id = job_result['id']
        await self._wait_for_job_completion(scraper_client, job_id)
        
        # Get results
        return await scraper_client.get_job_results(job_id)
    
    async def _enrich_data(self):
        """Stage 2: Enrich collected data"""
        enrichment_client = EnrichmentServiceClient()
        
        # Get unprocessed records
        records = await self._get_unprocessed_records()
        
        # Create enrichment jobs
        enrichment_jobs = []
        for record in records[:self.config.max_leads]:
            for enrichment_type in self.config.enrichment_types:
                job = await enrichment_client.create_job({
                    "source_table": record['table'],
                    "source_id": record['id'],
                    "enrichment_types": [enrichment_type]
                })
                enrichment_jobs.append(job['id'])
        
        # Wait for all jobs to complete
        await self._wait_for_enrichment_jobs(enrichment_client, enrichment_jobs)
        
        self.results['enrichment'] = {
            'jobs_created': len(enrichment_jobs),
            'records_enriched': len(records)
        }
    
    async def _analyze_images(self):
        """Stage 3: Analyze property images"""
        image_processor_client = ImageProcessorServiceClient()
        
        # Get properties with coordinates
        properties = await self._get_properties_with_coordinates()
        
        # Create image analysis jobs
        analysis_jobs = []
        for property_data in properties:
            if property_data.get('latitude') and property_data.get('longitude'):
                job = await image_processor_client.analyze_property({
                    "property_id": property_data['id'],
                    "latitude": property_data['latitude'],
                    "longitude": property_data['longitude']
                })
                analysis_jobs.append(job['job_id'])
        
        # Wait for analysis completion
        await self._wait_for_image_analysis_jobs(image_processor_client, analysis_jobs)
        
        self.results['image_analysis'] = {
            'properties_analyzed': len(analysis_jobs),
            'roof_detections': await self._count_roof_detections()
        }
    
    async def _score_leads(self):
        """Stage 4: Score leads based on collected data"""
        lead_generator_client = LeadGeneratorServiceClient()
        
        # Get enriched properties
        properties = await self._get_enriched_properties()
        
        # Score leads in batches
        batch_size = 50
        total_scored = 0
        
        for i in range(0, len(properties), batch_size):
            batch = properties[i:i + batch_size]
            property_ids = [p['id'] for p in batch]
            
            result = await lead_generator_client.score_batch({
                "property_ids": property_ids
            })
            
            total_scored += result['scored']
        
        self.results['lead_scoring'] = {
            'properties_scored': total_scored,
            'high_quality_leads': await self._count_high_quality_leads()
        }
    
    async def _validate_quality(self):
        """Stage 5: Validate lead quality"""
        # Get scored leads
        leads = await self._get_scored_leads()
        
        # Apply quality filters
        quality_leads = []
        for lead in leads:
            if self._meets_quality_criteria(lead):
                quality_leads.append(lead)
        
        # Store qualified leads
        await self._store_qualified_leads(quality_leads)
        
        self.results['quality_validation'] = {
            'leads_evaluated': len(leads),
            'leads_qualified': len(quality_leads),
            'quality_rate': len(quality_leads) / len(leads) if leads else 0
        }
    
    async def _deliver_leads(self):
        """Stage 6: Deliver leads to client"""
        qualified_leads = await self._get_qualified_leads()
        
        if self.config.delivery_format == "api":
            await self._deliver_via_api(qualified_leads)
        elif self.config.delivery_format == "email":
            await self._deliver_via_email(qualified_leads)
        elif self.config.delivery_format == "webhook":
            await self._deliver_via_webhook(qualified_leads)
        
        self.results['delivery'] = {
            'leads_delivered': len(qualified_leads),
            'delivery_method': self.config.delivery_format,
            'delivered_at': datetime.utcnow().isoformat()
        }
    
    def _meets_quality_criteria(self, lead: Dict[str, Any]) -> bool:
        """Check if lead meets quality criteria"""
        score = lead.get('overall_score', 0)
        
        # Basic score threshold
        if score < self.config.quality_threshold:
            return False
        
        # Must have contact information
        if not lead.get('owner_email') and not lead.get('owner_phone'):
            return False
        
        # Must have valid address
        if not lead.get('validated_address'):
            return False
        
        # Additional quality checks based on business rules
        return True
    
    def _generate_workflow_report(self) -> Dict[str, Any]:
        """Generate comprehensive workflow report"""
        return {
            "workflow_id": self.workflow_id,
            "status": self.status.value,
            "configuration": self.config.__dict__,
            "execution_time": self._calculate_execution_time(),
            "results": self.results,
            "progress": self.progress,
            "errors": self.errors,
            "quality_metrics": self._calculate_quality_metrics(),
            "cost_breakdown": self._calculate_cost_breakdown()
        }
```

#### 11.1.2 Storm Event Processing Workflow
```python
# backend/app/workflows/storm_processing.py
class StormEventProcessor:
    """Process storm events for lead generation opportunities"""
    
    async def process_storm_event(self, storm_data: Dict[str, Any]):
        """Process a detected storm event"""
        
        # 1. Validate storm data
        validated_storm = await self._validate_storm_data(storm_data)
        
        # 2. Determine affected areas
        affected_areas = await self._calculate_affected_areas(validated_storm)
        
        # 3. Identify potential properties
        properties = await self._find_properties_in_areas(affected_areas)
        
        # 4. Assess damage probability
        damage_assessments = await self._assess_damage_probability(properties, validated_storm)
        
        # 5. Generate storm-triggered leads
        storm_leads = await self._generate_storm_leads(damage_assessments)
        
        # 6. Prioritize by urgency
        prioritized_leads = await self._prioritize_storm_leads(storm_leads)
        
        # 7. Notify relevant parties
        await self._notify_storm_leads(prioritized_leads)
        
        return {
            "storm_id": validated_storm['id'],
            "affected_properties": len(properties),
            "leads_generated": len(storm_leads),
            "high_priority_leads": len([l for l in prioritized_leads if l['priority'] == 'urgent'])
        }
    
    async def _assess_damage_probability(self, properties: List[Dict], storm: Dict) -> List[Dict]:
        """Assess probability of storm damage for each property"""
        assessments = []
        
        for property_data in properties:
            # Calculate distance from storm center
            distance = self._calculate_distance(
                property_data['latitude'], property_data['longitude'],
                storm['center_lat'], storm['center_lon']
            )
            
            # Assess based on storm intensity and property characteristics
            probability = self._calculate_damage_probability(property_data, storm, distance)
            
            if probability > 0.3:  # 30% threshold
                assessments.append({
                    'property_id': property_data['id'],
                    'damage_probability': probability,
                    'storm_id': storm['id'],
                    'assessment_factors': self._get_assessment_factors(property_data, storm)
                })
        
        return assessments
```

### 11.2 Advanced Business Rules Engine

#### 11.2.1 Dynamic Pricing Engine
```python
# backend/app/business/pricing_engine.py
class DynamicPricingEngine:
    """Dynamic pricing based on lead quality, market conditions, and demand"""
    
    def __init__(self):
        self.base_prices = {
            'premium': 25.00,
            'standard': 15.00,
            'budget': 8.00
        }
        self.market_multipliers = {}
        self.demand_factors = {}
    
    async def calculate_lead_price(self, lead_data: Dict[str, Any]) -> float:
        """Calculate dynamic price for a lead"""
        
        # Base price by tier
        base_price = self.base_prices.get(lead_data['pricing_tier'], 15.00)
        
        # Quality multiplier (0.5x to 2.0x)
        quality_multiplier = self._calculate_quality_multiplier(lead_data['overall_score'])
        
        # Market demand multiplier
        market_multiplier = await self._get_market_multiplier(
            lead_data['city'], lead_data['state']
        )
        
        # Urgency multiplier (storm events, etc.)
        urgency_multiplier = self._calculate_urgency_multiplier(lead_data)
        
        # Competition factor
        competition_factor = await self._get_competition_factor(
            lead_data['city'], lead_data['state']
        )
        
        # Calculate final price
        final_price = (base_price * 
                      quality_multiplier * 
                      market_multiplier * 
                      urgency_multiplier * 
                      competition_factor)
        
        # Apply pricing constraints
        return self._apply_pricing_constraints(final_price, lead_data)
    
    def _calculate_quality_multiplier(self, score: int) -> float:
        """Calculate quality-based price multiplier"""
        if score >= 90:
            return 2.0
        elif score >= 80:
            return 1.5
        elif score >= 70:
            return 1.2
        elif score >= 60:
            return 1.0
        elif score >= 50:
            return 0.8
        else:
            return 0.5
    
    async def _get_market_multiplier(self, city: str, state: str) -> float:
        """Get market-based pricing multiplier"""
        # Check recent sales data and market conditions
        market_data = await self._fetch_market_data(city, state)
        
        # High-value markets get higher multipliers
        if market_data['median_home_value'] > 500000:
            return 1.3
        elif market_data['median_home_value'] > 300000:
            return 1.1
        else:
            return 0.9
    
    def _calculate_urgency_multiplier(self, lead_data: Dict) -> float:
        """Calculate urgency-based multiplier"""
        urgency_score = 1.0
        
        # Storm damage potential
        if lead_data.get('storm_affected'):
            urgency_score *= 1.5
        
        # Recent permit activity
        if lead_data.get('recent_permits'):
            urgency_score *= 1.2
        
        # Seasonal factors
        if self._is_peak_season():
            urgency_score *= 1.1
        
        return min(urgency_score, 2.0)  # Cap at 2x
```

#### 11.2.2 Lead Quality Intelligence Engine
```python
# backend/app/business/quality_intelligence.py
class QualityIntelligenceEngine:
    """Advanced lead quality assessment using ML and business rules"""
    
    def __init__(self):
        self.quality_models = {
            'roof_age_predictor': RoofAgeModel(),
            'damage_detector': DamageDetectionModel(),
            'conversion_predictor': ConversionPredictionModel(),
            'value_estimator': PropertyValueModel()
        }
    
    async def assess_lead_quality(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Comprehensive lead quality assessment"""
        
        quality_scores = {}
        
        # Technical quality assessment
        quality_scores['technical'] = await self._assess_technical_quality(lead_data)
        
        # Commercial viability assessment
        quality_scores['commercial'] = await self._assess_commercial_viability(lead_data)
        
        # Timing assessment
        quality_scores['timing'] = await self._assess_timing_factors(lead_data)
        
        # Competitive landscape assessment
        quality_scores['competitive'] = await self._assess_competitive_factors(lead_data)
        
        # Calculate composite quality score
        composite_score = self._calculate_composite_score(quality_scores)
        
        # Generate quality recommendations
        recommendations = self._generate_quality_recommendations(quality_scores, lead_data)
        
        return {
            'composite_score': composite_score,
            'component_scores': quality_scores,
            'quality_grade': self._assign_quality_grade(composite_score),
            'recommendations': recommendations,
            'confidence_level': self._calculate_confidence_level(quality_scores)
        }
    
    async def _assess_technical_quality(self, lead_data: Dict) -> Dict[str, float]:
        """Assess technical aspects of the lead"""
        
        scores = {}
        
        # Roof condition assessment
        if lead_data.get('roof_analysis'):
            roof_data = lead_data['roof_analysis']
            scores['roof_condition'] = self._score_roof_condition(roof_data)
            scores['damage_severity'] = self._score_damage_severity(roof_data)
        
        # Property characteristics
        scores['property_age'] = self._score_property_age(lead_data.get('year_built'))
        scores['property_value'] = self._score_property_value(lead_data.get('property_value'))
        scores['location_quality'] = await self._score_location_quality(lead_data)
        
        return scores
    
    async def _assess_commercial_viability(self, lead_data: Dict) -> Dict[str, float]:
        """Assess commercial viability of the lead"""
        
        scores = {}
        
        # Owner financial capacity
        scores['financial_capacity'] = await self._assess_financial_capacity(lead_data)
        
        # Project size and scope
        scores['project_value'] = self._assess_project_value(lead_data)
        
        # Insurance claims potential
        scores['insurance_potential'] = await self._assess_insurance_potential(lead_data)
        
        return scores
    
    def _calculate_composite_score(self, quality_scores: Dict[str, Dict]) -> float:
        """Calculate weighted composite quality score"""
        
        weights = {
            'technical': 0.4,
            'commercial': 0.3,
            'timing': 0.2,
            'competitive': 0.1
        }
        
        composite = 0.0
        total_weight = 0.0
        
        for category, category_scores in quality_scores.items():
            if category in weights:
                category_average = sum(category_scores.values()) / len(category_scores)
                composite += category_average * weights[category]
                total_weight += weights[category]
        
        return composite / total_weight if total_weight > 0 else 0.0
```

### 11.3 Automated Decision Making System

#### 11.3.1 Lead Routing and Assignment
```python
# backend/app/business/lead_routing.py
class LeadRoutingEngine:
    """Intelligent lead routing based on client preferences and performance"""
    
    async def route_lead(self, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Route lead to appropriate client/contractor"""
        
        # Get eligible clients
        eligible_clients = await self._get_eligible_clients(lead_data)
        
        # Score client matches
        client_scores = []
        for client in eligible_clients:
            match_score = await self._calculate_client_match_score(lead_data, client)
            client_scores.append({
                'client_id': client['id'],
                'match_score': match_score,
                'client_data': client
            })
        
        # Sort by match score
        client_scores.sort(key=lambda x: x['match_score'], reverse=True)
        
        # Apply routing rules
        selected_client = await self._apply_routing_rules(lead_data, client_scores)
        
        # Create lead assignment
        assignment = await self._create_lead_assignment(lead_data, selected_client)
        
        return assignment
    
    async def _calculate_client_match_score(self, lead_data: Dict, client: Dict) -> float:
        """Calculate how well a client matches the lead"""
        
        score = 0.0
        
        # Geographic preference (40% weight)
        geo_score = self._calculate_geographic_match(lead_data, client)
        score += geo_score * 0.4
        
        # Service type match (30% weight)
        service_score = self._calculate_service_match(lead_data, client)
        score += service_score * 0.3
        
        # Performance history (20% weight)
        performance_score = await self._calculate_performance_score(client)
        score += performance_score * 0.2
        
        # Capacity and availability (10% weight)
        capacity_score = await self._calculate_capacity_score(client)
        score += capacity_score * 0.1
        
        return score
    
    async def _apply_routing_rules(self, lead_data: Dict, client_scores: List[Dict]) -> Dict:
        """Apply business rules for lead routing"""
        
        # Rule 1: High-value leads to premium clients
        if lead_data.get('estimated_value', 0) > 50000:
            premium_clients = [c for c in client_scores if c['client_data'].get('tier') == 'premium']
            if premium_clients:
                return premium_clients[0]
        
        # Rule 2: Storm leads to emergency-capable clients
        if lead_data.get('storm_triggered'):
            emergency_clients = [c for c in client_scores if c['client_data'].get('emergency_capable')]
            if emergency_clients:
                return emergency_clients[0]
        
        # Rule 3: Balanced distribution
        return await self._balance_lead_distribution(client_scores)
```

#### 11.3.2 Real-time Quality Optimization
```python
# backend/app/business/quality_optimizer.py
class RealTimeQualityOptimizer:
    """Real-time optimization of lead quality and delivery"""
    
    def __init__(self):
        self.optimization_rules = []
        self.performance_metrics = {}
        self.feedback_processor = FeedbackProcessor()
    
    async def optimize_lead_delivery(self, lead_batch: List[Dict]) -> List[Dict]:
        """Optimize lead delivery in real-time"""
        
        optimized_leads = []
        
        for lead in lead_batch:
            # Apply real-time optimizations
            optimized_lead = await self._apply_optimizations(lead)
            
            # Validate optimization results
            if await self._validate_optimization(optimized_lead):
                optimized_leads.append(optimized_lead)
            else:
                # Fallback to original or skip
                logger.warning(f"Optimization failed for lead {lead['id']}")
                optimized_leads.append(lead)
        
        return optimized_leads
    
    async def _apply_optimizations(self, lead: Dict) -> Dict:
        """Apply optimization rules to a single lead"""
        
        optimized = lead.copy()
        
        # Dynamic pricing optimization
        optimized['price'] = await self._optimize_pricing(lead)
        
        # Contact data optimization
        optimized = await self._optimize_contact_data(optimized)
        
        # Timing optimization
        optimized['delivery_timing'] = await self._optimize_delivery_timing(optimized)
        
        # Content optimization
        optimized['presentation'] = await self._optimize_presentation(optimized)
        
        return optimized
    
    async def process_feedback(self, lead_id: str, feedback: Dict[str, Any]):
        """Process client feedback to improve optimization"""
        
        # Store feedback
        await self.feedback_processor.store_feedback(lead_id, feedback)
        
        # Update optimization models
        await self._update_optimization_models(feedback)
        
        # Adjust real-time parameters
        await self._adjust_optimization_parameters(feedback)
```

---

## 12. PLATFORM ROADMAP AND FUTURE SPECIFICATIONS

### 12.1 Phase 1: Foundation (Months 1-3)

#### 12.1.1 Core Infrastructure
- **Microservices Architecture**: Complete deployment of all 6 core services
- **Database Schema**: Full implementation of PostgreSQL with PostGIS
- **Authentication System**: Multi-provider OAuth implementation
- **Basic UI**: React dashboard with essential features
- **CI/CD Pipeline**: Automated testing and deployment

#### 12.1.2 Basic Features
- **Data Collection**: Permit and property scraping for 10 major cities
- **Lead Scoring**: Basic ML-powered scoring algorithm
- **Contact Discovery**: Email and phone lookup with 2-3 providers
- **Image Analysis**: Basic roof detection using YOLOv8
- **API Access**: RESTful API with rate limiting

### 12.2 Phase 2: Enhancement (Months 4-6)

#### 12.2.1 Advanced AI Capabilities
- **Multi-Modal Intelligence**: Computer vision + NLP + structured data
- **Predictive Analytics**: Storm impact prediction and timing optimization
- **Quality Intelligence**: Advanced lead quality assessment
- **Dynamic Pricing**: Market-based pricing algorithms

#### 12.2.2 Scale and Performance
- **Geographic Expansion**: 50+ cities with localized data sources
- **Real-time Processing**: Stream processing for immediate lead generation
- **Advanced Caching**: Multi-tier caching strategy
- **Performance Optimization**: Sub-second response times

### 12.3 Phase 3: Intelligence (Months 7-9)

#### 12.3.1 Machine Learning Platform
- **Custom Model Training**: Industry-specific model development
- **A/B Testing Framework**: Continuous optimization platform
- **Feedback Loop Integration**: Client feedback improving algorithms
- **Conversion Prediction**: Advanced conversion probability models

#### 12.3.2 Business Intelligence
- **Market Analysis**: Competitive landscape analysis
- **Trend Prediction**: Market trend forecasting
- **ROI Optimization**: Client return on investment optimization
- **Performance Analytics**: Comprehensive analytics dashboard

### 12.4 Phase 4: Ecosystem (Months 10-12)

#### 12.4.1 Platform Ecosystem
- **Partner Integrations**: CRM and marketing tool integrations
- **API Marketplace**: Third-party developer ecosystem
- **White-label Solutions**: Private-label platform offerings
- **Mobile Applications**: Native iOS and Android apps

#### 12.4.2 Advanced Features
- **AI Chat Assistant**: Intelligent lead consultation assistant
- **Automated Follow-up**: Smart nurturing campaigns
- **Compliance Automation**: Automated regulatory compliance
- **Global Expansion**: International market support

### 12.5 Technology Evolution Roadmap

#### 12.5.1 AI/ML Advancement Timeline
```
Year 1:
- Basic computer vision (YOLOv8, ESRGAN)
- Rule-based lead scoring
- Simple NLP for data extraction

Year 2:
- Advanced vision models (Segment Anything, DINOv2)
- Neural lead scoring with transformers
- Multi-modal fusion architectures

Year 3:
- Custom foundation models
- Reinforcement learning for optimization
- Edge AI deployment

Year 4:
- AGI integration for complex reasoning
- Quantum-enhanced optimization
- Autonomous business decision making
```

#### 12.5.2 Infrastructure Scaling Plan
```
Current: Single region deployment (US-East)
6 months: Multi-region with CDN
12 months: Global edge deployment
18 months: Hybrid cloud + edge computing
24 months: Quantum-ready infrastructure
```

### 12.6 Business Model Evolution

#### 12.6.1 Pricing Strategy Progression
```python
# Current: Simple tiered pricing
current_model = {
    "premium": "$25/lead",
    "standard": "$15/lead", 
    "budget": "$8/lead"
}

# Phase 2: Dynamic pricing
dynamic_model = {
    "base_price": "variable",
    "quality_multiplier": "0.5x - 2.0x",
    "market_multiplier": "0.8x - 1.5x",
    "urgency_multiplier": "1.0x - 2.0x"
}

# Phase 3: Value-based pricing
value_model = {
    "pricing_basis": "predicted_conversion_value",
    "revenue_sharing": "percentage_of_contract_value",
    "performance_bonuses": "conversion_rate_based"
}

# Phase 4: Ecosystem pricing
ecosystem_model = {
    "platform_fee": "percentage_of_transaction",
    "api_usage": "per_call_pricing",
    "white_label": "revenue_sharing",
    "premium_features": "subscription_tiers"
}
```

#### 12.6.2 Market Expansion Strategy
1. **Vertical Expansion**: HVAC, Solar, Windows, Siding
2. **Geographic Expansion**: Canada, UK, Australia
3. **Enterprise Solutions**: Large contractor networks
4. **Technology Licensing**: AI models and algorithms

### 12.7 Competitive Advantage Framework

#### 12.7.1 Technical Moats
- **Proprietary AI Models**: Custom-trained for roofing industry
- **Data Network Effects**: More clients = better predictions
- **Real-time Processing**: Sub-second lead generation
- **Multi-modal Intelligence**: Unique combination of data types

#### 12.7.2 Business Moats
- **Quality Guarantee**: Performance-based pricing
- **Compliance Expertise**: Deep regulatory knowledge
- **Industry Relationships**: Direct municipal partnerships
- **Technology Patents**: Key algorithmic innovations

### 12.8 Success Metrics and KPIs

#### 12.8.1 Technical KPIs
```python
technical_kpis = {
    "system_performance": {
        "response_time_p95": "<500ms",
        "uptime": ">99.9%",
        "error_rate": "<0.1%",
        "throughput": ">10,000 leads/hour"
    },
    "ai_performance": {
        "lead_score_accuracy": ">85%",
        "conversion_prediction": ">80%",
        "image_detection_accuracy": ">95%",
        "contact_discovery_rate": ">70%"
    },
    "data_quality": {
        "address_validation_rate": ">98%",
        "contact_deliverability": ">85%",
        "data_freshness": "<24 hours",
        "duplicate_rate": "<2%"
    }
}
```

#### 12.8.2 Business KPIs
```python
business_kpis = {
    "growth_metrics": {
        "monthly_recurring_revenue": "target_growth_rate",
        "customer_acquisition_cost": "target_reduction",
        "customer_lifetime_value": "target_increase",
        "market_share": "target_percentage"
    },
    "quality_metrics": {
        "lead_conversion_rate": ">12%",
        "client_satisfaction": ">4.5/5",
        "client_retention_rate": ">90%",
        "lead_quality_score": ">75/100"
    },
    "operational_metrics": {
        "cost_per_lead": "target_reduction",
        "processing_efficiency": "target_improvement",
        "api_cost_optimization": "target_savings",
        "support_ticket_resolution": "<2 hours"
    }
}
```

### 12.9 Risk Mitigation and Contingency Planning

#### 12.9.1 Technical Risks
- **AI Model Performance**: Continuous model validation and fallbacks
- **Data Source Changes**: Multiple source redundancy
- **API Rate Limits**: Cost-optimized API usage strategies
- **Scale Challenges**: Auto-scaling infrastructure design

#### 12.9.2 Business Risks
- **Market Competition**: Continuous innovation and differentiation
- **Regulatory Changes**: Proactive compliance monitoring
- **Economic Downturns**: Flexible pricing and value propositions
- **Client Concentration**: Diversified client base strategy

### 12.10 Innovation Pipeline

#### 12.10.1 Emerging Technologies
- **Satellite Imagery Analysis**: Real-time roof condition monitoring
- **IoT Integration**: Smart home device data integration
- **Blockchain Verification**: Immutable lead quality certification
- **AR/VR Tools**: Virtual roof inspection capabilities

#### 12.10.2 Research and Development
- **Academic Partnerships**: University research collaborations
- **Open Source Contributions**: Strategic technology contributions
- **Patent Portfolio**: Intellectual property development
- **Innovation Labs**: Experimental technology incubation

---

## CONCLUSION

The Fishmouth Complete Technical Specification represents the most comprehensive and advanced lead generation platform ever conceived for the roofing industry. This document encompasses:

### Technical Excellence
- **10+ Microservices** with specialized AI capabilities
- **Multi-modal Intelligence** combining imagery, data, and NLP
- **Real-time Processing** with sub-second response times
- **Enterprise-grade Security** with GDPR compliance
- **Cloud-native Infrastructure** with global scalability

### Business Innovation
- **Dynamic Pricing Engine** with market-based optimization
- **Quality Intelligence** with 85%+ accuracy predictions
- **Automated Workflows** from data collection to lead delivery
- **Performance Analytics** with comprehensive business insights

### Competitive Advantages
- **Proprietary AI Models** trained specifically for roofing
- **Multi-source Data Fusion** from 50+ data providers
- **Real-time Storm Integration** for immediate opportunity detection
- **End-to-end Automation** reducing manual processes by 95%

### Future-ready Architecture
- **Modular Design** enabling rapid feature development
- **API-first Approach** supporting ecosystem growth
- **Machine Learning Pipeline** for continuous improvement
- **Global Deployment** capability with edge computing

This specification provides the complete blueprint for building the world's most advanced roofing lead generation platform, combining cutting-edge AI technology with deep industry expertise to revolutionize how roofing contractors discover and convert high-quality leads.

The platform is designed to scale from startup to global enterprise, with clear phases of development, comprehensive testing frameworks, and robust operational procedures that ensure both technical excellence and business success.

**Total Document Size: ~8,000 lines covering every aspect of the Fishmouth platform**
