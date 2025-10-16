-- Scraper service tables
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  city TEXT,
  state TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  records_processed INT NOT NULL DEFAULT 0,
  records_succeeded INT NOT NULL DEFAULT 0,
  records_failed INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created ON scraping_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS raw_permits (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID REFERENCES scraping_jobs(id) ON DELETE CASCADE,
  permit_number TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  issue_date TEXT,
  permit_type TEXT,
  work_description TEXT,
  contractor_name TEXT,
  contractor_license TEXT,
  estimated_value TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS raw_properties (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID REFERENCES scraping_jobs(id) ON DELETE CASCADE,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  owner_name TEXT,
  owner_address TEXT,
  owner_city TEXT,
  owner_state TEXT,
  owner_zip TEXT,
  property_value TEXT,
  year_built TEXT,
  sqft TEXT,
  lot_size TEXT,
  beds TEXT,
  baths TEXT,
  property_type TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS raw_contractors (
  id BIGSERIAL PRIMARY KEY,
  job_id UUID REFERENCES scraping_jobs(id) ON DELETE CASCADE,
  company_name TEXT,
  owner_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  license_number TEXT,
  years_in_business TEXT,
  services JSONB,
  certifications JSONB,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


