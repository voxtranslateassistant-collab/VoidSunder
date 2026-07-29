create table if not exists inventory_observations (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  asset_id uuid not null references assets(id) on delete cascade, scan_id uuid references scans(id) on delete set null,
  category text not null check (category in ('dns','technology','route','script','api_surface','transport')),
  name text not null, value_masked text, source text not null, confidence numeric(3,2) not null default 0.80 check (confidence between 0 and 1), observed_at timestamptz not null default now(), unique(asset_id, category, name, source)
);
create index if not exists inventory_observations_asset_idx on inventory_observations(asset_id, observed_at desc);
alter table inventory_observations enable row level security;
create policy inventory_observations_member on inventory_observations for all using (is_org_member(org_id)) with check (is_org_member(org_id));
