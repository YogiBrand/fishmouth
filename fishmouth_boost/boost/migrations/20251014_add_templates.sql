create table if not exists templates(
  id text primary key,
  scope text not null check (scope in ('report','email','sms')),
  content text not null,
  version int not null default 1,
  is_system boolean not null default false,
  updated_at timestamptz not null default now()
);
