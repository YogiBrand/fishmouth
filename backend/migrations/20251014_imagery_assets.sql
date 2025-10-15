-- Storage-efficient imagery & assets metadata
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                      -- 'tile' | 'overlay' | 'thumbnail' | 'report_pdf' | 'report_preview'
  storage_key TEXT NOT NULL,               -- path/key in local or S3
  url TEXT,                                -- CDN/public URL (presigned only on demand)
  checksum CHAR(64),
  byte_size BIGINT,
  width INT,
  height INT,
  content_type TEXT,
  expires_at TIMESTAMPTZ,                  -- lifecycle for ephemeral assets
  on_demand BOOLEAN DEFAULT true,          -- generate presigned URL at read-time
  created_at TIMESTAMPTZ DEFAULT now()
);

-- imagery instances per property/lead
CREATE TABLE IF NOT EXISTS property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,                  -- 'bing','google','nearmap','street_view'
  kind TEXT NOT NULL,                      -- 'aerial','oblique','street','overlay'
  zoom INT,
  direction TEXT,                          -- 'north','south','east','west','overhead'
  capture_date DATE,
  quality_score NUMERIC(5,2) DEFAULT 0,
  analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS property_images_prop_idx ON property_images(property_id);
CREATE INDEX IF NOT EXISTS property_images_lead_idx ON property_images(lead_id);
