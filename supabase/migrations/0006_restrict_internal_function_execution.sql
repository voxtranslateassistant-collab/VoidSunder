-- Funções internas usadas exclusivamente por políticas RLS não devem ser expostas a visitantes.
revoke execute on function public.is_org_member(uuid) from anon;

-- Função administrativa: nenhum cliente do PostgREST deve conseguir invocá-la.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
