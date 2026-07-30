create table if not exists ai_consensus_runs (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  scan_id uuid references scans(id) on delete set null, job_id uuid references scan_jobs(id) on delete set null,
  providers jsonb not null default '[]'::jsonb, consensus jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now()
);
create table if not exists ai_consensus_results (
  id uuid primary key default gen_random_uuid(), consensus_run_id uuid not null references ai_consensus_runs(id) on delete cascade,
  provider text not null, model text not null, status text not null check (status in ('completed','failed')),
  confidence numeric(3,2), analysis text, error_text text, latency_ms integer, created_at timestamptz not null default now()
);
alter table ai_consensus_runs enable row level security;
alter table ai_consensus_results enable row level security;
create policy ai_consensus_runs_member on ai_consensus_runs for all using (private.is_org_member(org_id)) with check (private.is_org_member(org_id));
create policy ai_consensus_results_member on ai_consensus_results for select using (exists (select 1 from ai_consensus_runs r where r.id = ai_consensus_results.consensus_run_id and private.is_org_member(r.org_id)));
