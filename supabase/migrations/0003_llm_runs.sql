create table llm_runs (
  id uuid primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  providers jsonb not null default '[]'::jsonb,
  results jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now()
);

create index llm_runs_org_started_idx on llm_runs(org_id, started_at desc);

alter table llm_runs enable row level security;

create policy llm_runs_member on llm_runs
  for all
  using (is_org_member(org_id))
  with check (is_org_member(org_id));
