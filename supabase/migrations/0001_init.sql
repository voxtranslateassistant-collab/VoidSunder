-- ============================================================
-- AegisForge — Schema inicial
-- ============================================================

create extension if not exists "pgcrypto";

-- --- Enums -------------------------------------------------
create type severity          as enum ('critical','high','medium','low','info');
create type asset_kind        as enum ('web_app','api','mobile','llm_endpoint','network');
create type asset_environment as enum ('production','staging','development');
create type scan_status       as enum ('queued','running','completed','failed','cancelled');
create type scan_profile      as enum ('passive_recon','owasp_baseline','owasp_full','api_fuzzing','llm_redteam');
create type finding_status    as enum ('open','triaging','confirmed','false_positive','remediated','accepted_risk');
create type engine_id         as enum ('zap','nuclei','playwright','custom_fuzzer','llm_probe');
create type evidence_kind     as enum ('http_transcript','screenshot','har','payload','video');
create type llm_attack_vector as enum ('prompt_injection','jailbreak','data_exfiltration','system_prompt_leak','tool_abuse','pii_disclosure');

-- --- Organizações e membros --------------------------------
create table organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

create table org_members (
  org_id  uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id)    on delete cascade,
  role    text not null default 'member' check (role in ('owner','admin','member','viewer')),
  primary key (org_id, user_id)
);

-- --- Assets ------------------------------------------------
create table assets (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  kind         asset_kind not null,
  environment  asset_environment not null default 'production',
  target       text not null,
  owner_team   text,
  tags         text[] not null default '{}',
  risk_score   smallint not null default 0 check (risk_score between 0 and 100),
  last_scan_at timestamptz,
  created_at   timestamptz not null default now()
);
create index assets_org_idx on assets(org_id);

-- --- Escopo e política -------------------------------------
create table scopes (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid not null references assets(id) on delete cascade,
  include_globs text[] not null default '{}',
  exclude_globs text[] not null default '{}',
  max_rps       integer not null default 10,
  window_start  time,
  window_end    time,
  authorized_by text,
  created_at    timestamptz not null default now()
);
create index scopes_asset_idx on scopes(asset_id);

-- --- Scans -------------------------------------------------
create table scans (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references organizations(id) on delete cascade,
  asset_id     uuid not null references assets(id) on delete cascade,
  profile      scan_profile not null,
  engines      engine_id[] not null default '{}',
  status       scan_status not null default 'queued',
  progress     smallint not null default 0 check (progress between 0 and 100),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  requested_by uuid references auth.users(id) on delete set null,
  error_text   text
);
create index scans_asset_idx  on scans(asset_id);
create index scans_status_idx on scans(status) where status in ('queued','running');

-- --- Findings ----------------------------------------------
create table findings (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  scan_id         uuid not null references scans(id)  on delete cascade,
  asset_id        uuid not null references assets(id) on delete cascade,
  title           text not null,
  severity        severity not null,
  status          finding_status not null default 'open',
  cwe             text,
  owasp_category  text,
  cvss            numeric(3,1) check (cvss between 0 and 10),
  engine          engine_id not null,
  endpoint        text,
  summary         text,
  ai_triage_note  text,
  confidence      numeric(3,2) check (confidence between 0 and 1),
  fingerprint     text not null,
  detected_at     timestamptz not null default now(),
  resolved_at     timestamptz,
  unique (asset_id, fingerprint)
);
create index findings_scan_idx     on findings(scan_id);
create index findings_severity_idx on findings(severity, status);

-- --- Evidence Vault ----------------------------------------
create table evidence (
  id          uuid primary key default gen_random_uuid(),
  finding_id  uuid not null references findings(id) on delete cascade,
  kind        evidence_kind not null,
  label       text not null,
  storage_path text not null,
  size_bytes  bigint not null default 0,
  sha256      text,
  captured_at timestamptz not null default now()
);
create index evidence_finding_idx on evidence(finding_id);

-- --- LLM Security Lab --------------------------------------
create table llm_tests (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  asset_id    uuid not null references assets(id) on delete cascade,
  model       text not null,
  vector      llm_attack_vector not null,
  attempts    integer not null default 0,
  successes   integer not null default 0,
  severity    severity not null default 'info',
  last_run_at timestamptz not null default now()
);
create index llm_tests_asset_idx on llm_tests(asset_id);

-- --- Auditoria ---------------------------------------------
create table activity_events (
  id       uuid primary key default gen_random_uuid(),
  org_id   uuid not null references organizations(id) on delete cascade,
  kind     text not null,
  message  text not null,
  actor    text not null,
  severity severity,
  at       timestamptz not null default now()
);
create index activity_org_at_idx on activity_events(org_id, at desc);

-- ============================================================
-- Row Level Security — isolamento por organização
-- ============================================================
alter table organizations   enable row level security;
alter table org_members     enable row level security;
alter table assets          enable row level security;
alter table scopes          enable row level security;
alter table scans           enable row level security;
alter table findings        enable row level security;
alter table evidence        enable row level security;
alter table llm_tests       enable row level security;
alter table activity_events enable row level security;

create or replace function is_org_member(target_org uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from org_members
    where org_id = target_org and user_id = auth.uid()
  );
$$;

create policy org_read on organizations
  for select using (is_org_member(id));

create policy member_read on org_members
  for select using (user_id = auth.uid() or is_org_member(org_id));

-- Tabelas com org_id direto
create policy assets_rw     on assets          for all using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy scans_rw      on scans           for all using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy findings_rw   on findings        for all using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy llm_tests_rw  on llm_tests       for all using (is_org_member(org_id)) with check (is_org_member(org_id));
create policy activity_rw   on activity_events for all using (is_org_member(org_id)) with check (is_org_member(org_id));

-- Tabelas que herdam a org via FK
create policy scopes_rw on scopes for all
  using (exists (select 1 from assets a where a.id = scopes.asset_id and is_org_member(a.org_id)))
  with check (exists (select 1 from assets a where a.id = scopes.asset_id and is_org_member(a.org_id)));

create policy evidence_rw on evidence for all
  using (exists (select 1 from findings f where f.id = evidence.finding_id and is_org_member(f.org_id)))
  with check (exists (select 1 from findings f where f.id = evidence.finding_id and is_org_member(f.org_id)));
