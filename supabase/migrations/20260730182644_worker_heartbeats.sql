-- A presence signal written only by the isolated worker service.
create table public.worker_heartbeats (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  worker_id text not null,
  status text not null default 'online' check (status in ('online', 'degraded')),
  last_seen_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index worker_heartbeats_seen_idx on public.worker_heartbeats(last_seen_at desc);

alter table public.worker_heartbeats enable row level security;
revoke all on table public.worker_heartbeats from anon;
grant select on table public.worker_heartbeats to authenticated;
grant select, insert, update on table public.worker_heartbeats to service_role;

create policy worker_heartbeats_member_read
on public.worker_heartbeats
for select
to authenticated
using (private.is_org_member(org_id));
