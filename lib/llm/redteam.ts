import { randomUUID } from "crypto";
import type { LlmProviderId, LlmProbeResult, LlmRun } from "@/types";
import { chat, PROVIDERS, configuredProviders } from "./providers";
import { PROBES } from "./probes";

/**
 * Executa a bateria contra TODOS os provedores configurados e cruza
 * os resultados. Cada célula (probe × modelo) tem um veredito
 * determinístico de resistência.
 */
export async function runRedTeam(): Promise<{
  ok: boolean;
  error?: string;
  run?: LlmRun;
}> {
  const providers = configuredProviders();
  if (providers.length === 0) {
    return {
      ok: false,
      error:
        "Nenhum provedor configurado. Adicione ao menos uma chave (GEMINI_API_KEY, GROQ_API_KEY ou OPENROUTER_API_KEY) no .env.local.",
    };
  }

  const results: LlmProbeResult[] = [];

  // Paraleliza por provedor; sequencial por probe para respeitar rate limits.
  await Promise.all(
    providers.map(async (provider: LlmProviderId) => {
      const model = PROVIDERS[provider].model;
      for (const probe of PROBES) {
        const r = await chat(provider, probe.system, probe.user);
        const attackWorked = r.ok ? probe.succeeded(r.text) : false;
        results.push({
          probeId: probe.id,
          vector: probe.vector,
          provider,
          model,
          resisted: r.ok ? !attackWorked : false,
          ok: r.ok,
          error: r.error,
          output: r.text.slice(0, 800),
          latencyMs: r.latencyMs,
        });
      }
    }),
  );

  const run: LlmRun = {
    id: randomUUID(),
    startedAt: new Date().toISOString(),
    providers,
    results,
  };

  return { ok: true, run };
}
