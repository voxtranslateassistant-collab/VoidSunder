-- Mantém o helper de RLS fora do schema exposto pelo PostgREST.
create schema if not exists private;
revoke all on schema private from public;
alter function public.is_org_member(uuid) set schema private;
