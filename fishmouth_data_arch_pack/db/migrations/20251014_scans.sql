-- Scans & polygon jobs
CREATE TABLE IF NOT EXISTS scan_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT,
  area_geom GEOMETRY(Polygon, 4326) NOT NULL,
  provider_policy JSONB NOT NULL DEFAULT '{}'::jsonb,  -- provider order, caps
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,          -- roof_age, value filters
  status TEXT NOT NULL DEFAULT 'queued',               -- queued|running|completed|failed
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,            -- counts, costs, tiles
  created_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS scan_jobs_geom_idx ON scan_jobs USING GIST (area_geom);

CREATE TABLE IF NOT EXISTS scan_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scan_jobs(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  reason_codes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS scan_results_scan_idx ON scan_results(scan_id);
