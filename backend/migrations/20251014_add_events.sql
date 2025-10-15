create extension if not exists pgcrypto;

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  actor text,
  lead_id integer,
  report_id varchar(64),
  call_id uuid,
  source_service text not null,
  payload jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_events_created_at on events (created_at);
create index if not exists idx_events_type on events (type);
