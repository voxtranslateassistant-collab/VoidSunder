# Implantação do AegisForge V1

1. Crie o projeto Supabase, habilite o login por e-mail e execute `0001_init.sql` e `0002_operational_v1.sql` nessa ordem.
2. Cadastre seu usuário em `organizations` e `org_members` com papel `owner`. O painel usa o usuário autenticado; o worker usa apenas a service role.
3. Publique o Next.js no Vercel com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `LLM_KEY_ENCRYPTION_SECRET` e `ASSET_CREDENTIAL_ENCRYPTION_SECRET`. Não configure `SUPABASE_SERVICE_ROLE_KEY` no Vercel: ela é exclusiva do worker.
4. Publique `worker/Dockerfile` em um serviço Docker. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ASSET_CREDENTIAL_ENCRYPTION_SECRET`, `WORKER_ID` e `WORKER_POLL_MS`.
5. Mantenha o bucket `evidence-vault` privado. Artefatos devem ser acessados somente por URLs assinadas emitidas pelo painel.

O worker é o único componente que faz requisições aos ativos. Ele exige escopo aprovado, verifica o destino antes da execução e não segue redirecionamentos.
