
-- Onboarding starter leads and unlocks
CREATE SCHEMA IF NOT EXISTS onboarding;

CREATE TABLE IF NOT EXISTS onboarding.starter_leads (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  external_id TEXT, -- optional id, e.g., property id from source
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  score NUMERIC,
  status TEXT, -- HOT | WARM | LOCKED
  locked BOOLEAN DEFAULT TRUE,
  details JSONB, -- minimal preview or full when unlocked
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_starter_leads_user ON onboarding.starter_leads(user_id);

CREATE TABLE IF NOT EXISTS onboarding.unlocks (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id BIGINT REFERENCES onboarding.starter_leads(id),
  cost_credits INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
