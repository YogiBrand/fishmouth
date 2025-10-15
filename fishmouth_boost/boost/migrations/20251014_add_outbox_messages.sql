create table if not exists outbox_messages(
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('email','sms')),
  payload jsonb not null,
  status text not null default 'queued',
  provider text,
  provider_id text,
  error text,
  created_at timestamptz default now(),
  sent_at timestamptz
);

create table if not exists message_events(
  id uuid primary key default gen_random_uuid(),
  message_id uuid references outbox_messages(id) on delete cascade,
  type text not null check (type in ('delivered','opened','clicked','bounced')),
  meta jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists idx_message_events_type on message_events (type);
