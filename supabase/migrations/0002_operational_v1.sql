-- AegisForge V1 operational model: scopes, asynchronous jobs and evidence vault.
-- Apply after 0001_init.sql.

create type job_status as enum ('queued', 'claimed', 'running', 'completed', 'failed', 'cancelled');
create type job_profile as enum ('web_recon', 'authenticated_web', 'api_validation', 'llm_lab');
create type scope_status as enum ('draft', 'approved', 'suspended');

alter table scopes
  add column if not exists status scope_status not null default 'draft',
  add column if not exists approved_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists allow_subdomains boolean not null default false,
  add column if not exists allowed_methods text[] not null default array['GET'],
  add column if not exists notes text;

create table scan_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade,
  scope_id uuid not null references scopes(id) on delete restrict,
  profile job_profile not null,
  status job_status not null default 'queued',
  requested_by uuid references auth.users(id) on delete set null,
  target_url text not null,
  configuration jsonb not null default '{}'::jsonb,
  progress smallint not null default 0 check (progress between 0 and 100),
  current_step text,
  worker_id text,
  lease_expires_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  error_text text,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);
create index scan_jobs_claim_idx on scan_jobs(status, created_at) where status in ('queued', 'claimed');
create index scan_jobs_asset_idx on scan_jobs(asset_id, created_at desc);

create table scan_steps (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references scan_jobs(id) on delete cascade,
  name text not null,
  status job_status not null default 'queued',
  message text,
  started_at timestamptz,
  finished_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);
alter table scan_steps add column if not exists created_at timestamptz not null default now();
create index scan_steps_job_idx on scan_steps(job_id, created_at);

create table asset_credentials (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('header', 'cookie', 'basic', 'bearer')),
  encrypted_value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table evidence_artifacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  job_id uuid references scan_jobs(id) on delete cascade,
  finding_id uuid references findings(id) on delete set null,
  kind text not null,
  label text not null,
  storage_path text not null unique,
  sha256 text not null,
  size_bytes bigint not null default 0,
  redacted_preview text,
  captured_at timestamptz not null default now()
);
create index evidence_artifacts_job_idx on evidence_artifacts(job_id);

create table reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  job_id uuid not null references scan_jobs(id) on delete cascade,
  content_markdown text not null,
  remediation_prompt text,
  provider text,
  model text,
  created_at timestamptz not null default now()
);

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_org_idx on audit_events(org_id, created_at desc);

alter table scan_jobs enable row level security;
alter table scan_steps enable row level security;
alter table asset_credentials enable row level security;
alter table evidence_artifacts enable row level security;
alter table reports enable row level security;
alter table audit_events enable row level security;

create policy scan_jobs_member on scan_jobs for all using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy scan_steps_member on scan_steps for all using (exists (select 1 from scan_jobs j where j.id = scan_steps.job_id and is_org_member(j.org_id))) with check (exists (select 1 from scan_jobs j where j.id = scan_steps.job_id and is_org_member(j.org_id)));
create policy credentials_member on asset_credentials for all using (exists (select 1 from assets a where a.id = asset_credentials.asset_id and is_org_member(a.org_id))) with check (exists (select 1 from assets a where a.id = asset_credentials.asset_id and is_org_member(a.org_id)));
create policy artifacts_member on evidence_artifacts for all using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy reports_member on reports for all using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy audit_member on audit_events for select using (is_org_member(org_id));

-- Storage is private; the app/worker issue short-lived signed URLs only.
insert into storage.buckets (id, name, public) values ('evidence-vault', 'evidence-vault', false)
on conflict (id) do update set public = false;

create policy evidence_vault_member_read on storage.objects for select
  using (bucket_id = 'evidence-vault' and exists (
    select 1 from evidence_artifacts ea where ea.storage_path = name and is_org_member(ea.org_id)
  ));
