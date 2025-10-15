alter table leads add column if not exists dnc boolean default false;
alter table leads add column if not exists consent_email boolean default false;
alter table leads add column if not exists consent_sms boolean default false;
alter table leads add column if not exists consent_voice boolean default false;
alter table leads add column if not exists dedupe_key char(64);
create unique index if not exists leads_dedupe_key_idx on leads(dedupe_key);
alter table leads add column if not exists provenance jsonb default '{}'::jsonb;
