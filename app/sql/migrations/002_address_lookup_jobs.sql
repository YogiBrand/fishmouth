CREATE TABLE IF NOT EXISTS address_lookup_jobs (
    job_id UUID PRIMARY KEY,
    address_input TEXT,
    normalized_address TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'processing',
    stage TEXT NOT NULL DEFAULT 'queued',
    enrichment JSONB,
    contact JSONB,
    analysis JSONB,
    quality JSONB,
    result JSONB,
    error TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_address_lookup_jobs_status ON address_lookup_jobs (status);
CREATE INDEX IF NOT EXISTS idx_address_lookup_jobs_updated_at ON address_lookup_jobs (updated_at DESC);

CREATE OR REPLACE FUNCTION set_address_lookup_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_address_lookup_jobs_updated_at ON address_lookup_jobs;

CREATE TRIGGER trg_address_lookup_jobs_updated_at
BEFORE UPDATE ON address_lookup_jobs
FOR EACH ROW
EXECUTE FUNCTION set_address_lookup_jobs_updated_at();
