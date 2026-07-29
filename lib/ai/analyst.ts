import type { Scan, Finding, LlmProviderId } from "@/types";
import { chat, configuredProviders, PROVIDERS } from "@/lib/llm/providers";
import { SEVERITY_LABEL, ENGINE_LABEL } from "@/lib/constants";

// ------------------------------------------------------------
// Analista de IA — usa a API key configurada para transformar
// achados brutos em análise de nível pentester.
// ------------------------------------------------------------

const SYSTEM = `Você é um analista sênior de segurança ofensiva (pentester) da plataforma VoidSunder.
Recebe achados REAIS de uma análise passiva/reconhecimento de um alvo AUTORIZADO.
Escreva em português do Brasil, técnico, direto e acionável.
Nunca invente achados que não estão nos dados. Não forneça payloads de exploração prontos;
descreva o risco e a correção. Baseie-se apenas nas evidências fornecidas.`;

/** Tenta cada provedor configurado em ordem; usa o próximo se um falhar (ex.: 429). */
async function chatWithFallback(
  system: string,
  user: string,
): Promise<{ ok: boolean; text?: string; provider?: string; error?: string }> {
  const providers = await configuredProviders();
  if (providers.length === 0) {
    return { ok: false, error: "Nenhum provedor de IA configurado (.env.local)." };
  }
  const errors: string[] = [];
  for (const p of providers) {
    const r = await chat(p, system, user);
    if (r.ok && r.text.trim()) {
      return { ok: true, text: r.text, provider: PROVIDERS[p].label };
    }
    errors.push(`${PROVIDERS[p].label}: ${r.error ?? "resposta vazia"}`);
  }
  return {
    ok: false,
    error: `Todos os provedores falharam. ${errors.join(" | ")}`,
  };
}

function findingsDigest(findings: Finding[]): string {
  return findings
    .map(
      (f, i) =>
        `${i + 1}. [${SEVERITY_LABEL[f.severity]}] ${f.title}\n` +
        `   engine=${ENGINE_LABEL[f.engine]} cwe=${f.cwe ?? "-"} owasp=${f.owaspCategory ?? "-"} endpoint=${f.endpoint}\n` +
        `   evidência: ${(f.evidenceSnippet ?? "-").slice(0, 300)}`,
    )
    .join("\n");
}

export interface AiResult {
  ok: boolean;
  text?: string;
  provider?: string;
  error?: string;
}

/** Relatório geral: resumo executivo, cadeias de ataque, priorização. */
export async function analyzeScan(
  scan: Scan,
  findings: Finding[],
): Promise<AiResult> {
  if (findings.length === 0) {
    return { ok: false, error: "Nenhum achado para analisar." };
  }

  const user = `ALVO: ${scan.targetUrl}
DATA: ${scan.startedAt}
TOTAL DE ACHADOS: ${findings.length}

ACHADOS:
${findingsDigest(findings)}

Produza um relatório com estas seções em markdown:
## Resumo executivo
(3-5 linhas sobre a postura de risco geral do alvo)
## Cadeias de ataque
(como achados individuais se COMBINAM em um ataque plausível — seja concreto, cite os achados por título)
## Prioridades
(ordem de correção, do mais urgente ao menos, com justificativa)
## Plano de remediação
(passos práticos e específicos)
## Prompt de correção
(Escreva, dentro de um bloco de código markdown, um prompt pronto em português para colar em um assistente de IA de programação — Claude Code, Cursor — instruindo a corrigir TODAS as falhas listadas, uma a uma, com as mudanças concretas de código/configuração. O prompt deve ser autossuficiente.)`;

  return chatWithFallback(SYSTEM, user);
}

/** Análise por achado: risco real, como seria explorado, correção. */
export async function analyzeFinding(finding: Finding): Promise<AiResult> {
  const user = `Analise em profundidade este achado de segurança:

TÍTULO: ${finding.title}
SEVERIDADE: ${SEVERITY_LABEL[finding.severity]}
CWE: ${finding.cwe ?? "-"}
OWASP: ${finding.owaspCategory ?? "-"}
ENDPOINT: ${finding.endpoint}
RESUMO: ${finding.summary}
EVIDÊNCIA REAL: ${finding.evidenceSnippet ?? "-"}

Responda em markdown com:
## Risco real
(o que um atacante consegue de fato com isso)
## Como seria explorado
(a lógica do ataque, em alto nível, sem payload pronto)
## Impacto no negócio
## Correção passo a passo`;

  return chatWithFallback(SYSTEM, user);
}
