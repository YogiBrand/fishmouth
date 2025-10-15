-- Migration 009: Growth module contractor prospects and user rewards
CREATE TABLE IF NOT EXISTS contractor_prospects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    website TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    source TEXT NOT NULL,
    identity_hash TEXT NOT NULL UNIQUE,
    score NUMERIC,
    tags JSONB NOT NULL DEFAULT '{}'::jsonb,
    enriched JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'new',
    sequence_stage INTEGER NOT NULL DEFAULT 0,
    first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    next_contact_at TIMESTAMP WITH TIME ZONE,
    reply_status TEXT,
    last_reply_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_contractor_prospects_status ON contractor_prospects(status);
CREATE INDEX IF NOT EXISTS ix_contractor_prospects_city_state ON contractor_prospects(city, state);
CREATE INDEX IF NOT EXISTS ix_contractor_prospects_score ON contractor_prospects(score DESC);

CREATE TABLE IF NOT EXISTS contractor_prospect_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prospect_id UUID NOT NULL REFERENCES contractor_prospects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_contractor_prospect_events_prospect ON contractor_prospect_events(prospect_id);
CREATE INDEX IF NOT EXISTS ix_contractor_prospect_events_type ON contractor_prospect_events(type);

ALTER TABLE users ADD COLUMN IF NOT EXISTS lead_credits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gift_credits_awarded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gift_leads_awarded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gift_awarded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_state JSONB NOT NULL DEFAULT '{}'::jsonb;
