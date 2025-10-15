create table if not exists marketing_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  company text not null,
  city text,
  state text,
  country text,
  source text,
  medium text,
  campaign text,
  notes text,
  ip inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_marketing_signups_created_at on marketing_signups (created_at);
