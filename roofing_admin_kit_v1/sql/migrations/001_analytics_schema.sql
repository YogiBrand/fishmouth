
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS analytics.users (
  user_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  credits INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.invoices (
  invoice_id UUID PRIMARY KEY,
  user_id UUID REFERENCES analytics.users(user_id),
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.transactions (
  txn_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES analytics.invoices(invoice_id),
  user_id UUID REFERENCES analytics.users(user_id),
  amount_cents INTEGER NOT NULL,
  kind TEXT NOT NULL, -- charge|refund|credit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics.usage_events (
  event_id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID,
  service TEXT NOT NULL,
  route TEXT,
  action TEXT,
  entity TEXT,
  quantity NUMERIC,
  unit TEXT,
  meta JSONB
);
CREATE INDEX IF NOT EXISTS idx_usage_ts ON analytics.usage_events(ts);
CREATE INDEX IF NOT EXISTS idx_usage_user ON analytics.usage_events(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_service ON analytics.usage_events(service);

CREATE TABLE IF NOT EXISTS analytics.cost_events (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  service TEXT NOT NULL,
  item TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  unit_cost NUMERIC NOT NULL,
  meta JSONB
);

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.kpi_daily AS
SELECT
  date_trunc('day', ts) AS day,
  COUNT(*) FILTER (WHERE action='lead_created') AS leads,
  COUNT(*) FILTER (WHERE action='email_sent') AS emails,
  COUNT(*) FILTER (WHERE action='call_started') AS calls,
  COUNT(DISTINCT user_id) AS dau
FROM analytics.usage_events
GROUP BY 1;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.api_usage_daily AS
SELECT date_trunc('day', ts) AS day, service, route, COUNT(*) AS calls
FROM analytics.usage_events
GROUP BY 1,2,3;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.costs_daily AS
SELECT date_trunc('day', ts) AS day, service, item,
       SUM(quantity*unit_cost) AS cost_usd
FROM analytics.cost_events
GROUP BY 1,2,3;

CREATE MATERIALIZED VIEW IF NOT EXISTS analytics.margin_daily AS
SELECT k.day,
       COALESCE(r.revenue_usd,0) AS revenue_usd,
       COALESCE(c.cost_usd,0) AS cost_usd,
       COALESCE(r.revenue_usd,0) - COALESCE(c.cost_usd,0) AS margin_usd
FROM (
  SELECT day, SUM(amount_cents)/100.0 AS revenue_usd
  FROM (
    SELECT date_trunc('day', created_at) AS day, amount_cents
    FROM analytics.transactions WHERE kind='charge'
  ) s GROUP BY day
) r
FULL OUTER JOIN (
  SELECT day, SUM(cost_usd) AS cost_usd FROM analytics.costs_daily GROUP BY day
) c USING (day)
FULL OUTER JOIN analytics.kpi_daily k USING (day);
