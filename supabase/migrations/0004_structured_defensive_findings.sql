-- Structured, defensive finding fields. Evidence remains redacted by design.
alter table findings
  add column if not exists finding_type text not null default 'security_misconfiguration',
  add column if not exists validation_status text not null default 'confirmed'
    check (validation_status in ('confirmed', 'conditional', 'informational')),
  add column if not exists evidence_masked text,
  add column if not exists evidence_hash text,
  add column if not exists source text,
  add column if not exists impact text,
  add column if not exists attack_prerequisites text,
  add column if not exists recommended_fix text,
  add column if not exists retest_steps text,
  add column if not exists scope_compliance text not null default 'approved'
    check (scope_compliance in ('approved', 'blocked_out_of_scope'));

create index if not exists findings_validation_status_idx on findings(validation_status);
