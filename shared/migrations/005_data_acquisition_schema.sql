-- Data Acquisition Schema Extensions
-- Apply these manually or integrate with your migration system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
-- Note: Geographic index requires PostGIS extension
-- CREATE INDEX IF NOT EXISTS idx_weather_events_location ON weather_events USING GIST (location_center);

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

-- Comments for documentation
COMMENT ON TABLE scraping_jobs IS 'Tracks scraping job execution and status';
COMMENT ON TABLE raw_permits IS 'Raw building permit data from various sources';
COMMENT ON TABLE raw_properties IS 'Raw property data from tax assessor records';
COMMENT ON TABLE raw_contractors IS 'Raw contractor information from various sources';
COMMENT ON TABLE enrichment_jobs IS 'Data enrichment job tracking';
COMMENT ON TABLE lead_scores IS 'Computed lead quality scores and pricing';
COMMENT ON TABLE weather_events IS 'Storm and weather event tracking for trigger detection';
COMMENT ON TABLE system_health IS 'System health monitoring and alerting';

-- Property Images Storage and Management
CREATE TABLE IF NOT EXISTS property_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES raw_properties(id) ON DELETE CASCADE,
    
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

CREATE INDEX IF NOT EXISTS idx_property_images_property ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_type ON property_images(image_type);
CREATE INDEX IF NOT EXISTS idx_property_images_processed ON property_images(processed);

-- AI-Powered Roof Analysis Results
CREATE TABLE IF NOT EXISTS roof_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES raw_properties(id) ON DELETE CASCADE,
    
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

CREATE INDEX IF NOT EXISTS idx_roof_analysis_property ON roof_analysis(property_id);
CREATE INDEX IF NOT EXISTS idx_roof_analysis_condition ON roof_analysis(overall_condition);
CREATE INDEX IF NOT EXISTS idx_roof_analysis_confidence ON roof_analysis(confidence_score DESC);

COMMENT ON TABLE property_images IS 'Property images from satellite, street view, and processed versions';
COMMENT ON TABLE roof_analysis IS 'AI-powered roof condition analysis and damage detection results';

-- **CRITICAL ADDITION: Missing table for Image Processor service**
-- Property Analysis Cache - stores various types of analysis results
CREATE TABLE IF NOT EXISTS property_analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES raw_properties(id) ON DELETE CASCADE,
    analysis_type VARCHAR(100) NOT NULL, -- streetview_analysis, detailed_damage_analysis, etc.
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(property_id, analysis_type)
);

CREATE INDEX IF NOT EXISTS idx_property_analysis_cache_property_type ON property_analysis_cache(property_id, analysis_type);
CREATE INDEX IF NOT EXISTS idx_property_analysis_cache_updated ON property_analysis_cache(updated_at DESC);

COMMENT ON TABLE property_analysis_cache IS 'Cached analysis results from various AI/processing services';

-- Configurable Job Scheduling
CREATE TABLE IF NOT EXISTS job_schedules (
    job_id VARCHAR(100) PRIMARY KEY,
    job_name VARCHAR(200) NOT NULL,
    job_type VARCHAR(50) NOT NULL, -- scraping, enrichment, lead_generation, image_processing, ml_analysis
    cron_expression VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    parameters JSONB DEFAULT '{}',
    cities TEXT[], -- Optional city filter
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_run_at TIMESTAMP,
    last_run_status VARCHAR(20), -- success, failed, running
    last_run_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_schedules_enabled ON job_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_job_schedules_type ON job_schedules(job_type);
CREATE INDEX IF NOT EXISTS idx_job_schedules_updated ON job_schedules(updated_at DESC);

COMMENT ON TABLE job_schedules IS 'User-configurable scheduled jobs for automated data acquisition workflows';

-- Data Source Configurations
CREATE TABLE IF NOT EXISTS data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- permit, property, contractor, weather, inspection
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    base_url TEXT NOT NULL,
    search_endpoint TEXT,
    detail_endpoint TEXT,
    login_required BOOLEAN DEFAULT FALSE,
    login_url TEXT,
    username_field VARCHAR(100),
    password_field VARCHAR(100),
    search_parameters JSONB DEFAULT '{}', -- Form parameters for searching
    extraction_rules JSONB DEFAULT '{}', -- Rules for extracting data from pages
    rate_limit_delay INTEGER DEFAULT 1000, -- Milliseconds between requests
    enabled BOOLEAN DEFAULT TRUE,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    last_scraped_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_sources_type_location ON data_sources(source_type, city, state);
CREATE INDEX IF NOT EXISTS idx_data_sources_enabled ON data_sources(enabled);
CREATE INDEX IF NOT EXISTS idx_data_sources_updated ON data_sources(updated_at DESC);

-- Data Source Authentication Credentials (encrypted)
CREATE TABLE IF NOT EXISTS data_source_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID REFERENCES data_sources(id) ON DELETE CASCADE,
    credential_type VARCHAR(50) NOT NULL, -- login, api_key, oauth
    encrypted_credentials TEXT NOT NULL, -- JSON containing encrypted auth data
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_source_auth_source ON data_source_auth(data_source_id);

-- City-specific scraping configurations
CREATE TABLE IF NOT EXISTS city_scrape_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    priority INTEGER DEFAULT 2, -- 1=high, 2=medium, 3=low
    scrape_frequency VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly
    max_records_per_run INTEGER DEFAULT 1000,
    data_sources UUID[] DEFAULT '{}', -- Array of data_source IDs to use for this city
    parameters JSONB DEFAULT '{}', -- City-specific parameters
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_city_scrape_configs_location ON city_scrape_configs(city, state);
CREATE INDEX IF NOT EXISTS idx_city_scrape_configs_enabled ON city_scrape_configs(enabled);
CREATE INDEX IF NOT EXISTS idx_city_scrape_configs_priority ON city_scrape_configs(priority);

COMMENT ON TABLE data_sources IS 'Configuration for external data sources to scrape';
COMMENT ON TABLE data_source_auth IS 'Authentication credentials for data sources';
COMMENT ON TABLE city_scrape_configs IS 'City-specific scraping configurations and data source assignments';