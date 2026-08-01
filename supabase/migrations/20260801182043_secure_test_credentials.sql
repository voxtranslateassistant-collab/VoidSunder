-- Encrypted operator-supplied credentials for controlled authenticated scans.
-- The value is AES-256-GCM ciphertext; plaintext never enters reports or evidence.

alter table asset_credentials drop constraint if exists asset_credentials_kind_check;
alter table asset_credentials add constraint asset_credentials_kind_check
  check (kind in ('header', 'cookie', 'basic', 'bearer', 'form_login'));

create unique index if not exists asset_credentials_asset_label_unique
  on asset_credentials(asset_id, label);
