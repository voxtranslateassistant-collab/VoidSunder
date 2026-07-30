# VoidSunder

Plataforma web de validação de segurança defensiva para ativos autorizados.

O VoidSunder cria jobs de auditoria, executa as verificações em um worker isolado, preserva evidências mínimas, organiza achados e permite análise colaborativa por IA, reteste e relatórios operacionais.

## Documento completo

O estado atual do projeto, arquitetura, recursos entregues, operação, segurança, variáveis de ambiente e evolução planejada estão em:

**[docs/VOID_SUNDER_PROJECT.md](docs/VOID_SUNDER_PROJECT.md)**

## Arquitetura

```text
Vercel (painel Next.js)
        ↓
Supabase (Auth, RLS, dados e evidências)
        ↑
Railway (worker Docker de jobs)
```

## Execução local

```bash
npm ci
npm run dev
```

Para validar a compilação de produção:

```bash
npm run build
```

## Segurança e escopo

Use somente ativos que você possui ou para os quais recebeu autorização explícita. O produto foi projetado para validação defensiva, com evidências mascaradas e controles de escopo.

## Deploy

- Produção: https://void-sunder.vercel.app
- O branch `main` aciona os deploys do painel e do worker.
- Segredos devem existir apenas nos provedores de infraestrutura, nunca em commits ou documentação.
