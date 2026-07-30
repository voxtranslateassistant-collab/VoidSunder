-- Preserve findings for each execution so retests can compare snapshots.
alter table public.findings
  drop constraint if exists findings_asset_id_fingerprint_key;

alter table public.findings
  add constraint findings_scan_id_fingerprint_key unique (scan_id, fingerprint);

create index if not exists findings_asset_fingerprint_idx
  on public.findings (asset_id, fingerprint);
