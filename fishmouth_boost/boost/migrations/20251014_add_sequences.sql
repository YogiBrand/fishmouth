create table if not exists sequences(
  id uuid primary key default gen_random_uuid(),
  name text not null,
  workflow_definition jsonb not null,
  active boolean not null default true
);

create table if not exists sequence_enrollments(
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references sequences(id) on delete cascade,
  lead_id uuid not null,
  current_step int not null default 0,
  status text not null default 'active',
  next_run_at timestamptz
);

create table if not exists sequence_history(
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references sequence_enrollments(id) on delete cascade,
  step_index int not null,
  event text not null,
  at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);
