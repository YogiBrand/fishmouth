create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  actor text,
  lead_id uuid,
  report_id uuid,
  call_id uuid,
  source_service text not null,
  payload jsonb not null default '{}'::jsonb,
  request_id text,
  created_at timestamptz not null default now()
);
create index if not exists events_created_idx on events(created_at);
create index if not exists events_type_idx on events(type);
