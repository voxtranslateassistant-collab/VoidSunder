# VoidSunder — Security Validation Orchestrator

Plataforma de validação de segurança. Você informa a URL de um alvo **que
possui ou tem autorização para testar**, e a plataforma faz uma leitura real da
resposta HTTP e reporta problemas de configuração de segurança.

## Rodar (Windows)

Dê dois cliques em **`iniciar-dashboard.bat`**. Ele instala as dependências na
primeira vez, sobe o servidor e abre o navegador em `http://localhost:3000`.

Ou manualmente:

```bash
npm install
npm run dev     # http://localhost:3000
```

## Como usar

1. Menu **New Scan** → cole a URL do alvo, marque a caixa de autorização,
   clique em **Executar scan**.
2. O scan roda na hora e você é levado a **Findings** com os achados reais.
3. Clique num achado para ver resumo, detalhes técnicos, evidência capturada e
   o plano de correção.
4. **Assets** lista os alvos e o score de risco. **Scans** mostra o histórico.
   **Evidence Vault** guarda os artefatos capturados. **Reports** gera um
   relatório HTML imprimível por scan.

Os resultados são reais e ficam salvos em `.data/db.json` dentro do projeto.

## O que é analisado

**Configuração (headers/transporte):** HTTPS/TLS, HSTS, Content-Security-Policy,
anti-clickjacking, X-Content-Type-Options, Referrer-Policy, Permissions-Policy,
flags de cookies (Secure/HttpOnly/SameSite), CORS permissivo, conteúdo misto.

**Recon profundo:**
- Segredos vazados no HTML e nos arquivos JS — chaves AWS/Google/Stripe/GitHub,
  tokens, JWT, chaves privadas, credenciais hardcoded (sempre **redigidos** nas
  evidências; o valor completo nunca é armazenado).
- E-mails e dados expostos (OSINT).
- Arquivos e caminhos sensíveis: `.env`, `.git/config`, `.aws/credentials`,
  backups e dumps SQL, `phpinfo`, `swagger`, etc. (~30 caminhos).
- Endpoints internos revelados no JavaScript (mapa de superfície).
- Fingerprint de tecnologia e versões.

**Analista de IA (usa sua API key):**
- Relatório pentester por scan: resumo executivo, **cadeias de ataque** (como as
  falhas se combinam), priorização e plano de remediação.
- Análise por achado sob demanda: risco real, como seria explorado, correção.

> **Escopo e limites.** A varredura usa apenas requisições GET (recon passivo/leve)
> — não executa ataques ativos (SQLi, XSS explorado, força bruta). Só escaneie
> alvos que você possui ou tem permissão explícita para testar.
## LLM Lab — red team cruzado (multi-modelo)

Dispara uma bateria de sondagens de injeção contra **vários modelos ao mesmo
tempo** e cruza os resultados numa matriz: quais modelos resistiram e quais
caíram em cada vetor, com score de resistência por modelo e consenso por vetor.

As sondagens são **seguras** — usam o padrão canário / palavra proibida (ex.:
"nunca escreva COMPROMETIDO" e então tenta forçar). Medem robustez a injeção
sem gerar conteúdo nocivo.

Provedores gratuitos suportados (adicione as chaves em `.env.local` e reinicie):

| Provedor | Chave grátis em | Variável |
| --- | --- | --- |
| Google Gemini | https://aistudio.google.com/apikey | `GEMINI_API_KEY` |
| Groq (Llama 3.3) | https://console.groq.com/keys | `GROQ_API_KEY` |
| OpenRouter | https://openrouter.ai/keys | `OPENROUTER_API_KEY` |

Conecte quantos quiser — quanto mais modelos, mais forte o cruzamento. Nenhum é
obrigatório; o LLM Lab habilita a execução assim que houver ao menos uma chave.

> A assinatura do claude.ai não gera API key. Para incluir o Claude, use uma
> chave do console da Anthropic (cobrança por uso à parte).

## Arquitetura

```
app/
  (app)/            # telas: dashboard, findings, assets, scans, evidence, reports, llm-lab, scans/new
  api/
    scans/          # POST executa scan real · GET lista
    reports/[id]/   # relatório HTML por scan
lib/
  scanner/
    checks.ts       # as verificações determinísticas (a "inteligência" do scan)
    passive.ts      # faz o fetch real e monta o contexto
    orchestrator.ts # roda o scan e persiste asset/scan/findings/evidence
  llm/              # providers, probes e orquestrador do red team
  store.ts          # persistência em .data/db.json
  constants.ts utils.ts
components/         # design system Vivid+Co + telas
types/index.ts      # modelos de domínio
supabase/           # schema SQL + RLS (para migrar da persistência local à nuvem)
```

## Persistência

Hoje: arquivo local `.data/db.json` (zero configuração). Para nuvem/multiusuário,
o schema em `supabase/migrations/0001_init.sql` já está pronto — basta conectar
e trocar as leituras de `lib/store.ts` pelas queries do Supabase.

## Stack

Next.js 15 (App Router) · React 19 · Tailwind v4 · TypeScript estrito.
Sem dependências externas de scanner — a análise usa `fetch` nativo do Node.
