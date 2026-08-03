import { randomUUID } from "node:crypto";
import { chat, configuredProviders, PROVIDERS } from "./providers";
import type { Finding, LlmProviderId } from "@/types";
import { createClient } from "@/lib/supabase/server";

type ProviderResult = {
  provider: LlmProviderId;
  model: string;
  status: "completed" | "failed";
  confidence: number;
  analysis: string;
  error: string | null;
  latencyMs: number;
};

function evidenceDigest(findings: Finding[]) {
  return findings
    .slice(0, 30)
    .map((finding) => `- [${finding.status}] ${finding.title}; severidade=${finding.severity}; evidência=${(finding.evidenceSnippet ?? finding.summary ?? "Sem trecho disponível").slice(0, 280)}; correção=${(finding.remediation ?? "Revisar a configuração e validar o reteste.").slice(0, 180)}`)
    .join("\n");
}

function confidence(text: string) {
  const confirmed = (text.match(/confirmad/gi) ?? []).length;
  const conditional = (text.match(/condicion|incert|limita/gi) ?? []).length;
  return Math.max(0.25, Math.min(0.95, 0.6 + confirmed * 0.04 - conditional * 0.03));
}

export async function orchestrateConsensus(input: { jobId: string; scanId?: string; findings: Finding[] }) {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Faça login para executar a análise colaborativa.");
  const { data: membership } = await supabase.from("org_members").select("org_id").eq("user_id", user.user.id).limit(1).maybeSingle();
  if (!membership) throw new Error("Usuário sem organização autorizada.");
  const providers = await configuredProviders();
  if (!providers.length) throw new Error("Nenhum provedor com adaptador ativo e chave configurada.");

  const system = "Você é um revisor defensivo independente. Use somente as evidências fornecidas; não invente falhas, não peça credenciais, não proponha exploração. Classifique cada conclusão como confirmado, condicionado ou informativo e proponha correções objetivas.";
  const prompt = `Analise este conjunto de achados de um scan autorizado. Produza: resumo, itens confirmados, riscos condicionados, limitações e plano priorizado.\n\n${evidenceDigest(input.findings)}`;
  const results = await Promise.all(providers.map(async (provider): Promise<ProviderResult> => {
    const result = await chat(provider, system, prompt);
    return {
      provider,
      model: result.model ?? PROVIDERS[provider].model,
      status: result.ok ? "completed" : "failed",
      confidence: result.ok ? confidence(result.text) : 0,
      analysis: result.text.slice(0, 8000),
      error: result.error,
      latencyMs: result.latencyMs,
    };
  }));
  const completed = results.filter((result) => result.status === "completed");
  const average = completed.length ? completed.reduce((sum, result) => sum + result.confidence, 0) / completed.length : 0;
  const divergences = completed.length < providers.length ? ["Um ou mais provedores falharam ou não responderam."] : [];
  const consensus = {
    id: randomUUID(),
    state: completed.length >= 2 ? "cross_validated" : "single_provider",
    confidence: Number(average.toFixed(2)),
    providersUsed: completed.map((result) => result.provider),
    divergences,
    report: completed.map((result) => `## ${PROVIDERS[result.provider].label}\n${result.analysis}`).join("\n\n"),
  };
  const { data: run, error } = await supabase.from("ai_consensus_runs").insert({ id: consensus.id, org_id: membership.org_id, scan_id: input.scanId ?? null, job_id: input.jobId, providers, consensus, created_by: user.user.id }).select("id").single();
  if (error) throw error;
  await supabase.from("ai_consensus_results").insert(results.map((result) => ({ consensus_run_id: run.id, provider: result.provider, model: result.model, status: result.status, confidence: result.confidence, analysis: result.analysis || null, error_text: result.error, latency_ms: result.latencyMs })));
  return consensus;
}
