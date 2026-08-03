-- Security and performance closeout for the operational V1.
-- This preserves the current API contract while tightening the database-owned
-- rate limiter and covering the foreign keys used by the dashboard.

drop policy if exists rate_limit_windows_no_direct_access on public.rate_limit_windows;
create policy rate_limit_windows_no_direct_access
  on public.rate_limit_windows
  for all
  using (false)
  with check (false);

create or replace function public.consume_rate_limit(p_action text)
returns boolean
language plpgsql
security definer
set search_path = ''
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

  v_window_started_at := pg_catalog.to_timestamp(
    pg_catalog.floor(extract(epoch from pg_catalog.now()) / v_window_seconds) * v_window_seconds
  );

  delete from public.rate_limit_windows
    where user_id = v_user_id and window_started_at < pg_catalog.now() - interval '2 days';

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

create index if not exists ai_consensus_runs_created_by_idx on public.ai_consensus_runs(created_by);
create index if not exists audit_events_actor_id_idx on public.audit_events(actor_id);
create index if not exists evidence_artifacts_org_id_idx on public.evidence_artifacts(org_id);
create index if not exists findings_org_id_idx on public.findings(org_id);
create index if not exists inventory_observations_org_id_idx on public.inventory_observations(org_id);
create index if not exists inventory_observations_scan_id_idx on public.inventory_observations(scan_id);
create index if not exists llm_provider_keys_created_by_idx on public.llm_provider_keys(created_by);
create index if not exists llm_tests_org_id_idx on public.llm_tests(org_id);
create index if not exists org_members_user_id_idx on public.org_members(user_id);
create index if not exists reports_job_id_idx on public.reports(job_id);
create index if not exists reports_org_id_idx on public.reports(org_id);
create index if not exists scan_jobs_org_id_idx on public.scan_jobs(org_id);
create index if not exists scan_jobs_requested_by_idx on public.scan_jobs(requested_by);
create index if not exists scan_jobs_scope_id_idx on public.scan_jobs(scope_id);
create index if not exists scans_org_id_idx on public.scans(org_id);
create index if not exists scans_requested_by_idx on public.scans(requested_by);
create index if not exists scopes_approved_by_idx on public.scopes(approved_by);

drop policy if exists member_read on public.org_members;
create policy member_read on public.org_members
  for select using (
    user_id = (select auth.uid()) or (select private.is_org_member(org_id))
  );
