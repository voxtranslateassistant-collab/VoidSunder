create table if not exists llm_provider_keys (
  id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations(id) on delete cascade,
  provider text not null check (provider in ('gemini', 'groq', 'openrouter')), ciphertext text not null, iv text not null, auth_tag text not null,
  created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(org_id, provider)
);
alter table llm_provider_keys enable row level security;
create policy llm_provider_keys_member on llm_provider_keys for all using (private.is_org_member(org_id)) with check (private.is_org_member(org_id));
