# VoidSunder — Documento do Projeto

**Última atualização:** 30 de julho de 2026  
**Repositório:** `voxtranslateassistant-collab/VoidSunder`  
**Aplicação pública:** https://void-sunder.vercel.app

## 1. Visão do produto

VoidSunder é uma plataforma web de validação de segurança defensiva para ativos autorizados. Ela organiza o ciclo completo de uma auditoria: cadastro do ativo, aprovação de escopo, criação de job, execução no worker isolado, coleta de evidências, triagem de achados, análise colaborativa por IA, reteste e relatório.

O produto foi desenhado para uso operacional e comercial: o operador acompanha scans, transforma achados em recomendações objetivas e possui trilha de auditoria para demonstrar a origem de cada resultado.

> O sistema trabalha somente sobre alvos explicitamente autorizados. Evidências sensíveis são minimizadas e mascaradas; o produto não realiza coleta de credenciais, reutilização de chaves, exfiltração, brute-force ou acesso indevido.

## 2. Arquitetura hospedada

```text
Operador
   │
   ▼
Painel Next.js no Vercel
   │ cria, consulta e cancela jobs autenticados
   ▼
Supabase
   ├─ Auth e organizações
   ├─ dados operacionais e trilha de auditoria
   ├─ RLS por organização
   └─ Storage privado para evidências
   ▲
   │ busca jobs e grava progresso/resultados
Worker Docker permanente no Railway
```

### Componentes

| Componente | Responsabilidade |
| --- | --- |
| Vercel | Painel, APIs autenticadas e telas do operador. Não executa o scan diretamente. |
| Supabase | Autenticação, RLS, organizações, ativos, escopos, jobs, achados, evidências, inventário, chaves de IA e auditoria. |
| Railway | Worker Docker isolado, responsável por buscar e processar jobs pendentes. |
| GitHub | Fonte de código e gatilho de deploy para Vercel/Railway. |

## 3. Fluxo de operação

1. O operador cria ou seleciona um ativo autorizado.
2. Define o escopo permitido: domínio, rota, API e ambiente.
3. Escolhe um perfil de scan e cria um `scan_job`.
4. O worker do Railway reclama o job e atualiza etapas, logs e porcentagem.
5. O worker registra inventário, evidências mínimas e achados persistentes.
6. O operador analisa os achados, solicita consenso de IA quando houver provedores ativos e aplica a correção no ambiente do cliente.
7. O operador usa **Solicitar reteste** para criar um novo job com o mesmo ativo, escopo e perfil.
8. O relatório consolida riscos e recomendações para entrega ao cliente.

## 4. Recursos entregues

### Operação de scans

- Jobs assíncronos: `queued`, `claimed`, `running`, `completed`, `failed` e `cancelled`.
- Progresso em tempo real por consulta periódica, com etapa atual e animação de processamento.
- Cancelamento, logs e recuperação de estado no modelo de jobs.
- Reteste com rastreio para o job de origem.
- Controle de escopo no backend: destinos fora do escopo, redirecionamentos externos e redes/IPs internos são bloqueados.

### Perfis de auditoria

| Perfil | Objetivo atual |
| --- | --- |
| Reconhecimento Web | DNS, resposta HTTP, headers, tecnologias, scripts públicos, rotas e superfícies expostas. |
| Validação de API | Importação segura de OpenAPI e coleções Postman, inventário de endpoints e verificações de CORS/rate limit/configuração. |
| Aplicação autenticada | Estrutura preparada para fluxos com contas de teste; conector Playwright é uma evolução operacional pendente. |
| Laboratório de IA | Sondagens seguras de resistência de modelos e análise colaborativa de achados. |

### Achados e evidências

- Achados com severidade, estado, origem, impacto, recomendação e confiança.
- Evidências técnicas mascaradas e auditáveis.
- Detecção de headers de segurança ausentes, configurações CORS inseguras, políticas de navegador, exposição de superfície e sinais de rate limit ausente.
- Inventário persistido de ativos, URLs, tecnologias e observações.
- Deduplicação e vínculo entre job, ativo, escopo e reteste no modelo de dados.

### Inteligência artificial

- Cofre de chaves no servidor com criptografia AES-256-GCM.
- A chave nunca é retornada para o navegador depois de salva.
- Validação remota de chave para provedores com adaptador de validação: Gemini, Groq, OpenRouter e OpenAI.
- Adaptadores de análise para Gemini, Groq, OpenRouter, OpenAI e Anthropic.
- Catálogo expansível de provedores: Together AI, Cohere, Hugging Face, Fireworks, Replicate, Aleph Alpha, Scale AI e provedores personalizados podem ser cadastrados com segurança para ativação posterior.
- Orquestrador de consenso: envia somente dados minimizados dos achados aos provedores ativos, normaliza resultados, calcula confiança e registra divergências e histórico no Supabase.
- Lab de IA com visualização de provedores conectados e estado de processamento.

### Segurança da própria plataforma

- Autenticação por Supabase Auth.
- Isolamento de dados por organização via Row Level Security (RLS).
- Funções auxiliares movidas para schema privado e permissões públicas revogadas.
- Segredos de IA criptografados em repouso e aceitos apenas por rota autenticada.
- Headers defensivos no painel: HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`.
- Eventos de auditoria para operações importantes, incluindo solicitação de reteste.
- Separação entre credenciais de painel e credenciais de serviço do worker.

## 5. Estrutura de dados principal

| Entidade | Finalidade |
| --- | --- |
| `organizations` / `org_members` | Isolamento de cada operação e usuários autorizados. |
| `assets` | Ativos monitorados e seu ambiente. |
| `scopes` | Limites aprovados de domínio, rota, API e ambiente. |
| `scan_profiles` | Perfil escolhido para a validação. |
| `scan_jobs` / `scan_steps` | Fila, progresso, logs e execução. |
| `findings` | Achados estruturados e sua severidade. |
| `evidence_artifacts` | Evidências vinculadas, com conteúdo mínimo mascarado. |
| `inventory_observations` | Itens descobertos no inventário técnico. |
| `reports` | Relatórios e sínteses operacionais. |
| `llm_provider_keys` | Referências a chaves de provedores criptografadas. |
| `ai_consensus_runs` / `ai_consensus_results` | Histórico de análises colaborativas. |
| `audit_events` | Trilhas de auditoria. |

## 6. Como usar

### Criar um scan

1. Abra **Novo Scan**.
2. Selecione o **tipo de ativo**:
   - **Web App:** site ou aplicação web.
   - **API:** serviço HTTP, OpenAPI ou coleção Postman.
   - **LLM Endpoint:** endpoint/modelo de IA autorizado.
3. Selecione o **perfil**:
   - **Reconhecimento Web:** inventário e configuração pública.
   - **Aplicação autenticada:** fluxos autorizados com contas de teste.
   - **Validação de API:** rotas, métodos e configurações da API.
   - **Laboratório de IA:** resistência de modelos a sondagens seguras.
4. Informe o **ambiente**:
   - **Produção:** ativo real em operação; mantenha o escopo estrito.
   - **Staging:** homologação; indicado para validar correções antes da produção.
   - **Desenvolvimento:** ambiente interno de desenvolvimento autorizado.
5. Confirme a autorização e envie o job.
6. Acompanhe a tela do job. Enquanto estiver ativo, ela mostra a etapa e a animação; ao terminar, exibe a barra final, análise por consenso e reteste.

### Adicionar uma chave de IA

1. Abra **Integrações**.
2. Escolha um provedor ou selecione **Outro provedor**.
3. Cole a chave no campo protegido.
4. Clique em **Validar e salvar chave**.
5. Quando a validação for suportada, a tela confirmará que a chave foi validada, criptografada e está pronta para uso. Para provedores sem adaptador, ela confirmará o armazenamento seguro e indicará que a ativação no Lab depende do conector correspondente.

Pré-requisito: a variável `LLM_KEY_ENCRYPTION_SECRET` precisa existir somente no ambiente do Vercel. Ela não deve ser inserida na tela da plataforma nem enviada a terceiros.

## 7. Variáveis de ambiente

As variáveis são configuradas no Vercel e no Railway, nunca no código ou no GitHub.

| Variável | Onde | Uso |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | URL pública do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | Cliente autenticado do painel. |
| `SUPABASE_SERVICE_ROLE_KEY` | Railway | Acesso de serviço exclusivo do worker. |
| `SUPABASE_URL` | Railway | URL do projeto Supabase usada pelo worker. |
| `WORKER_SERVICE_SECRET` | Railway e Vercel | Autenticação entre serviços quando configurada. |
| `LLM_KEY_ENCRYPTION_SECRET` | Vercel | Material criptográfico do cofre de chaves de IA. |

### Regras de segurança para segredos

- Não salve chaves reais em `.env.example`, commits, issues, prints ou documentação.
- Nunca use `SUPABASE_SERVICE_ROLE_KEY` no navegador.
- Ao suspeitar de exposição, revogue/rotacione a chave no provedor antes de continuar.
- A rotação de `LLM_KEY_ENCRYPTION_SECRET` exige cadastrar novamente as chaves de IA já criptografadas com a chave anterior.

## 8. Deploy e validação

### Painel

- O branch `main` do GitHub aciona o deploy do Vercel.
- A URL de produção é `https://void-sunder.vercel.app`.
- A validação local usada antes das publicações é:

```bash
npm ci
npm run build
```

### Worker

- O Railway publica a imagem Docker a partir do repositório.
- Após alterar worker, confirme nos logs do Railway que o processo está ativo e consultando jobs pendentes.
- Um scan permanecer em `0%` normalmente indica worker inativo, sem variáveis de serviço ou sem acesso ao Supabase.

## 9. Estado atual e evolução planejada

### Entregue e validado

- Arquitetura Vercel + Supabase + Railway.
- Jobs assíncronos, acompanhamento de progresso, inventário inicial, OpenAPI/Postman, evidências e achados estruturados.
- Cofre de chaves, conectores de IA principais, consenso e Lab de IA.
- Reteste e trilha de auditoria.
- Build de produção validado em 30/07/2026.

### Próximas evoluções

1. Relatório comercial completo por scan, com impressão/PDF e resumo executivo.
2. Comparação visual entre job original e reteste: corrigido, mantido e novo.
3. Expansão do inventário de superfície web e API.
4. Conector Playwright para fluxos autenticados usando somente contas de teste fornecidas pelo cliente.
5. Histórico e comparação de consenso entre modelos de IA.
6. Monitoramento operacional do worker e alertas de falha.
7. Ativar proteção contra senhas vazadas no Supabase Auth e manter rotina de rotação de segredos.

## 10. Limitações conhecidas

- O worker atual cobre validações defensivas de leitura e inventário; conectores especializados dependem de instalação e configuração operacional no Railway.
- Chaves de provedores adicionais podem ser guardadas com segurança, mas só participam do Lab quando existe adaptador de chamada para aquele provedor.
- O reteste recria o job com o mesmo escopo; a comparação detalhada antes/depois é a próxima evolução.
- Resultados automatizados devem ser revisados pelo operador antes de serem apresentados como vulnerabilidade confirmada ao cliente.

## 11. Suporte operacional rápido

| Situação | Verificação inicial |
| --- | --- |
| Scan parado em `0%` | Conferir se o worker Railway está ativo, com URL/SERVICE ROLE do Supabase corretas. |
| Chave de IA não salva | Conferir se `LLM_KEY_ENCRYPTION_SECRET` existe no Vercel e se o usuário está autenticado. |
| Chave de IA não valida | Conferir permissões, créditos e limite da conta do provedor. |
| Painel abre com erro | Verificar os logs da função no Vercel e as variáveis do Supabase. |
| Dados não aparecem | Conferir login, organização do usuário e políticas RLS do Supabase. |

---

Este documento descreve o estado efetivamente implementado do VoidSunder em 30/07/2026. Atualize-o junto de cada alteração relevante de arquitetura, segurança ou operação.
