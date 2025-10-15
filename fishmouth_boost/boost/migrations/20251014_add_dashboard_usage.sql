create table if not exists billing_usage(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  quantity int not null,
  unit text not null default 'lead',
  recorded_at timestamptz not null default now(),
  stripe_usage_record_id text
);

create table if not exists wallet_credits(
  user_id uuid primary key,
  balance_int int not null default 0
);
