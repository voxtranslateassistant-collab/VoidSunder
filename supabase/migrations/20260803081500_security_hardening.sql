-- Centralized per-user limits for costly actions. Values are deliberately kept
-- in the function so a browser client cannot choose a higher allowance.
create table if not exists public.rate_limit_windows (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null,
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, action, window_started_at)
);

alter table public.rate_limit_windows enable row level security;
revoke all on table public.rate_limit_windows from anon, authenticated;

create or replace function public.consume_rate_limit(p_action text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_limit integer;
  v_window_seconds integer := 600;
  v_window_started_at timestamptz;
  v_requests integer;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  case p_action
    when 'scan_job_create' then v_limit := 10;
    when 'ai_consensus' then v_limit := 8;
    when 'ai_finding_analysis' then v_limit := 12;
    when 'scan_analysis' then v_limit := 8;
    when 'llm_lab_run' then v_limit := 5;
    else raise exception 'unsupported rate limit action';
  end case;

  v_window_started_at := to_timestamp(floor(extract(epoch from now()) / v_window_seconds) * v_window_seconds);
  delete from public.rate_limit_windows
    where user_id = v_user_id and window_started_at < now() - interval '2 days';

  insert into public.rate_limit_windows (user_id, action, window_started_at, requests)
  values (v_user_id, p_action, v_window_started_at, 1)
  on conflict (user_id, action, window_started_at) do update
    set requests = public.rate_limit_windows.requests + 1
    where public.rate_limit_windows.requests < v_limit
  returning requests into v_requests;

  return v_requests is not null;
end;
$$;

revoke all on function public.consume_rate_limit(text) from public, anon;
grant execute on function public.consume_rate_limit(text) to authenticated;

create index if not exists ai_consensus_results_run_idx on public.ai_consensus_results(consensus_run_id);
create index if not exists ai_consensus_runs_org_created_idx on public.ai_consensus_runs(org_id, created_at desc);
create index if not exists ai_consensus_runs_job_created_idx on public.ai_consensus_runs(job_id, created_at desc);
create index if not exists ai_consensus_runs_scan_created_idx on public.ai_consensus_runs(scan_id, created_at desc);
create index if not exists evidence_artifacts_finding_captured_idx on public.evidence_artifacts(finding_id, captured_at desc);
