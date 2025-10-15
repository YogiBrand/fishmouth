-- Core geospatial entities (properties/leads with geometry)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_address TEXT NOT NULL,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  county TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  geom GEOMETRY(Point, 4326),
  year_built INT,
  square_footage INT,
  assessed_value NUMERIC(12,2),
  roof_type TEXT,
  roof_age_years INT,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS properties_geom_idx ON properties USING GIST (geom);
CREATE INDEX IF NOT EXISTS properties_zip_idx ON properties(zipcode);

-- Leads table (geo points reference property)
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  score NUMERIC(5,2) DEFAULT 0,
  tier TEXT GENERATED ALWAYS AS (
    CASE WHEN score >= 80 THEN 'hot'
         WHEN score >= 60 THEN 'warm'
         WHEN score >= 40 THEN 'cold'
         ELSE 'disqualified' END
  ) STORED,
  priority_score NUMERIC(6,2) DEFAULT 0,
  confidence NUMERIC(5,2) DEFAULT 0,
  reason_codes TEXT[] DEFAULT '{}',
  image_quality NUMERIC(5,2) DEFAULT 0,
  contact_quality NUMERIC(5,2) DEFAULT 0,
  dnc BOOLEAN DEFAULT false,
  consent_email BOOLEAN DEFAULT false,
  consent_sms BOOLEAN DEFAULT false,
  consent_voice BOOLEAN DEFAULT false,
  dedupe_key CHAR(64),
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS leads_dedupe_idx ON leads(dedupe_key);
-- Quick view to join geo
CREATE VIEW IF NOT EXISTS leads_geo AS
SELECT l.*, p.latitude, p.longitude, p.geom
FROM leads l JOIN properties p ON p.id = l.property_id;
