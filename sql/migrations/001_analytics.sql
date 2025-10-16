CREATE SCHEMA IF NOT EXISTS analytics;
-- Ensure UUID generation is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS analytics.users (
  user_id UUID PRIMARY KEY,
  email TEXT,
  plan TEXT DEFAULT 'free',
  credits INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.transactions (
  txn_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES analytics.users(user_id),
  amount_cents INT NOT NULL,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.usage_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT now(),
  service TEXT,
  route TEXT,
  action TEXT,
  user_id UUID,
  entity TEXT,
  quantity NUMERIC,
  unit TEXT,
  meta JSONB
);

CREATE TABLE IF NOT EXISTS analytics.cost_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT now(),
  service TEXT,
  item TEXT,
  quantity NUMERIC,
  unit TEXT,
  unit_cost NUMERIC,
  meta JSONB
);

CREATE OR REPLACE VIEW analytics.api_usage_daily AS
SELECT date_trunc('day', ts)::date AS day, service, route, COUNT(*)::bigint AS calls
FROM analytics.usage_events
GROUP BY 1,2,3;

CREATE OR REPLACE VIEW analytics.margin_daily AS
SELECT d.day,
       COALESCE(r.revenue_usd,0) AS revenue_usd,
       COALESCE(c.cost_usd,0) AS cost_usd,
       COALESCE(r.revenue_usd,0) - COALESCE(c.cost_usd,0) AS margin_usd
FROM (
  SELECT generate_series(current_date - interval '120 days', current_date, interval '1 day')::date AS day
) d
LEFT JOIN (
  SELECT date_trunc('day', created_at)::date AS day,
         SUM(CASE WHEN kind='charge' THEN amount_cents END)/100.0 AS revenue_usd
  FROM analytics.transactions GROUP BY 1
) r USING(day)
LEFT JOIN (
  SELECT date_trunc('day', ts)::date AS day,
         SUM(quantity*unit_cost)::numeric AS cost_usd
  FROM analytics.cost_events GROUP BY 1
) c USING(day);

CREATE OR REPLACE VIEW analytics.kpi_daily AS
SELECT date_trunc('day', ts)::date AS day,
       COUNT(*) FILTER (WHERE action='lead_created')::int AS leads,
       COUNT(*) FILTER (WHERE action='email_sent')::int AS emails,
       COUNT(*) FILTER (WHERE action='call_started')::int AS calls,
       COUNT(DISTINCT user_id)::int AS dau
FROM analytics.usage_events
GROUP BY 1;


