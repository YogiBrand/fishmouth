-- Funnel & KPI materialized views (refresh nightly or on demand)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_funnel_daily AS
SELECT date_trunc('day', created_at) AS day,
  sum(CASE WHEN type='report.sent' THEN 1 ELSE 0 END) AS sent,
  sum(CASE WHEN type='report.viewed' THEN 1 ELSE 0 END) AS viewed,
  sum(CASE WHEN type='message.clicked' THEN 1 ELSE 0 END) AS clicked,
  sum(CASE WHEN type='appointment.booked' THEN 1 ELSE 0 END) AS appt
FROM events
GROUP BY 1
ORDER BY 1 DESC;

CREATE INDEX IF NOT EXISTS mv_funnel_daily_day_idx ON mv_funnel_daily(day);
