create table if not exists public_shares (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  token char(32) not null unique,
  expires_at timestamptz null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
