# Implantação do AegisForge V1

1. Crie o projeto Supabase, habilite o login por e-mail e execute `0001_init.sql` e `0002_operational_v1.sql` nessa ordem.
2. Cadastre seu usuário em `organizations` e `org_members` com papel `owner`. O painel usa o usuário autenticado; o worker usa apenas a service role.
3. Publique o Next.js no Vercel com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e as chaves dos provedores de IA necessárias.
4. Publique `worker/Dockerfile` em um serviço Docker. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WORKER_ID` e `WORKER_POLL_MS`.
5. Mantenha o bucket `evidence-vault` privado. Artefatos devem ser acessados somente por URLs assinadas emitidas pelo painel.

O worker é o único componente que faz requisições aos ativos. Ele exige escopo aprovado, verifica o destino antes da execução e não segue redirecionamentos.
