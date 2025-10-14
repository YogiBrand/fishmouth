-- DATABASE SCHEMA EXTENSIONS FOR DATA ACQUISITION SYSTEM
-- Add these tables to your existing PostgreSQL database

-- Scraping Jobs Management
CREATE TABLE IF NOT EXISTS scraping_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL, -- permit, property, image, contractor, weather
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    records_processed INTEGER DEFAULT 0,
    records_succeeded INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_type_city ON scraping_jobs(job_type, city, state);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created ON scraping_jobs(created_at);

-- Scraping Error Log
CREATE TABLE IF NOT EXISTS scraping_errors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES scraping_jobs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    error_type VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scraping_errors_job_id ON scraping_errors(job_id);
CREATE INDEX IF NOT EXISTS idx_scraping_errors_resolved ON scraping_errors(resolved);

-- Scraping Cache
CREATE TABLE IF NOT EXISTS scraping_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text/html',
    http_status INTEGER DEFAULT 200,
    scraped_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_url ON scraping_cache(url);
CREATE INDEX IF NOT EXISTS idx_cache_expires ON scraping_cache(expires_at);

-- Raw Permit Data
CREATE TABLE IF NOT EXISTS raw_permits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES scraping_jobs(id) ON DELETE CASCADE,
    permit_number VARCHAR(100),
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),
    issue_date DATE,
    permit_type VARCHAR(100),
    work_description TEXT,
    contractor_name VARCHAR(200),
    contractor_license VARCHAR(50),
    estimated_value NUMERIC(12,2),
    source_url TEXT,
    raw_data JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_permits_job_id ON raw_permits(job_id);
CREATE INDEX IF NOT EXISTS idx_raw_permits_address ON raw_permits(address);
CREATE INDEX IF NOT EXISTS idx_raw_permits_processed ON raw_permits(processed);
CREATE INDEX IF NOT EXISTS idx_raw_permits_city_state ON raw_permits(city, state);

-- Raw Property Data
CREATE TABLE IF NOT EXISTS raw_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES scraping_jobs(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),
    owner_name VARCHAR(200),
    owner_address TEXT,
    owner_city VARCHAR(100),
    owner_state VARCHAR(2),
    owner_zip VARCHAR(10),
    property_value NUMERIC(12,2),
    year_built INTEGER,
    sqft INTEGER,
    lot_size NUMERIC(10,2),
    beds INTEGER,
    baths NUMERIC(3,1),
    property_type VARCHAR(50),
    source_url TEXT,
    raw_data JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_properties_job_id ON raw_properties(job_id);
CREATE INDEX IF NOT EXISTS idx_raw_properties_address ON raw_properties(address);
CREATE INDEX IF NOT EXISTS idx_raw_properties_processed ON raw_properties(processed);

-- Raw Contractor Data
CREATE TABLE IF NOT EXISTS raw_contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES scraping_jobs(id) ON DELETE CASCADE,
    company_name VARCHAR(200) NOT NULL,
    owner_name VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2),
    zip VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(200),
    website TEXT,
    license_number VARCHAR(50),
    years_in_business INTEGER,
    services TEXT[],
    certifications TEXT[],
    source_url TEXT,
    raw_data JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_raw_contractors_job_id ON raw_contractors(job_id);
CREATE INDEX IF NOT EXISTS idx_raw_contractors_company ON raw_contractors(company_name);
CREATE INDEX IF NOT EXISTS idx_raw_contractors_processed ON raw_contractors(processed);

-- Enrichment Jobs
CREATE TABLE IF NOT EXISTS enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table VARCHAR(50) NOT NULL, -- raw_permits, raw_properties, raw_contractors
    source_id UUID NOT NULL,
    enrichment_type VARCHAR(50) NOT NULL, -- email_lookup, phone_lookup, address_validation
    status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
    provider VARCHAR(50), -- hunter_io, melissa, google_maps
    cost NUMERIC(8,4) DEFAULT 0,
    result JSONB DEFAULT '{}',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_source ON enrichment_jobs(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_status ON enrichment_jobs(status);
CREATE INDEX IF NOT EXISTS idx_enrichment_jobs_type ON enrichment_jobs(enrichment_type);

-- Lead Scores
CREATE TABLE IF NOT EXISTS lead_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES raw_properties(id) ON DELETE CASCADE,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    roof_age_score INTEGER DEFAULT 0,
    property_value_score INTEGER DEFAULT 0,
    storm_activity_score INTEGER DEFAULT 0,
    neighborhood_score INTEGER DEFAULT 0,
    owner_match_score INTEGER DEFAULT 0,
    urgency_score INTEGER DEFAULT 0,
    buying_signals JSONB DEFAULT '[]',
    triggers_detected JSONB DEFAULT '[]',
    pricing_tier VARCHAR(20), -- premium, standard, budget
    price_per_lead NUMERIC(6,2),
    exclusive_territory VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_property ON lead_scores(property_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_overall ON lead_scores(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_lead_scores_pricing ON lead_scores(pricing_tier);

-- Weather Events (for storm tracking)
CREATE TABLE IF NOT EXISTS weather_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- hail, wind, tornado
    severity INTEGER NOT NULL, -- 1-5 scale
    location_center GEOGRAPHY(POINT,4326) NOT NULL,
    radius_miles NUMERIC(6,2) NOT NULL,
    event_date DATE NOT NULL,
    max_wind_speed INTEGER,
    hail_size_inches NUMERIC(3,1),
    damage_estimate NUMERIC(12,2),
    source VARCHAR(50) NOT NULL, -- noaa, insurance, local
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_events_date ON weather_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_weather_events_type ON weather_events(event_type);
CREATE INDEX IF NOT EXISTS idx_weather_events_location ON weather_events USING GIST (location_center);

-- System Health Monitoring
CREATE TABLE IF NOT EXISTS system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(50) NOT NULL,
    health_check VARCHAR(50) NOT NULL, -- database, api, scraper, queue
    status VARCHAR(20) NOT NULL, -- healthy, degraded, down
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    metadata JSONB DEFAULT '{}',
    checked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_health_service ON system_health(service_name, health_check);
CREATE INDEX IF NOT EXISTS idx_system_health_checked ON system_health(checked_at DESC);

-- Clean up old cache entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS void AS $$
BEGIN
    DELETE FROM scraping_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;