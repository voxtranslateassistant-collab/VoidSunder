"use client";

import { useState } from "react";
import { BrainCircuit, Loader2, CheckCircle2, XCircle, Ban, ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LlmRun, LlmProbeResult } from "@/types";

interface ProviderStatus {
  id: string;
  label: string;
  model: string;
  keyUrl: string;
  envKey: string;
  configured: boolean;
}

const VECTOR_LABEL: Record<string, string> = {
  prompt_injection: "Prompt Injection",
  system_prompt_leak: "Vazamento de System Prompt",
  instruction_override: "Sobrescrita de Instrução",
  tool_abuse: "Abuso de Ferramenta",
  delimiter_escape: "Escape de Delimitador",
};

const PROBE_TITLE: Record<string, string> = {
  "direct-override": "Sobrescrita direta",
  "system-leak": "Vazamento de system prompt",
  "roleplay-injection": "Injeção via role-play",
  "delimiter-escape": "Escape de delimitador",
  "tool-abuse": "Abuso de ferramenta",
};

function Cell({ r }: { r: LlmProbeResult | undefined }) {
  if (!r) return <td className="px-3 py-2.5 text-center text-graphite-veil">—</td>;
  if (!r.ok) {
    return (
      <td className="px-3 py-2.5 text-center" title={r.error ?? "erro"}>
        <Ban className="mx-auto size-4 text-graphite-veil" strokeWidth={1.5} />
      </td>
    );
  }
  return (
    <td className="px-3 py-2.5 text-center">
      {r.resisted ? (
        <CheckCircle2 className="mx-auto size-4 text-prism-lime" strokeWidth={1.5} />
      ) : (
        <XCircle className="mx-auto size-4 text-prism-red" strokeWidth={1.5} />
      )}
    </td>
  );
}

function ConsensusNetwork({ providers, active }: { providers: ProviderStatus[]; active: boolean }) {
  const connected = providers.filter((provider) => provider.configured);
  if (connected.length < 2) return null;
  return <Card className="overflow-hidden"><CardContent className="relative py-5"><div className="absolute inset-x-12 top-1/2 h-px bg-prism-cyan/20" />
    <div className="relative flex items-center justify-between gap-3">{connected.map((provider) => <div key={provider.id} className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className={`relative flex size-10 items-center justify-center rounded-full border border-prism-cyan/50 bg-surface-2 text-xs text-prism-cyan ${active ? "animate-pulse" : ""}`}><BrainCircuit className="size-4" /></span><span className="truncate text-xs text-fog-blue">{provider.label}</span></div>)}</div>
    <p className="mt-4 text-center text-xs text-graphite-veil">{active ? "Modelos analisando em conjunto e comparando evidências…" : "Modelos conectados prontos para análise colaborativa."}</p></CardContent></Card>;
}

export function LlmLab({
  providers,
  initialRun,
}: {
  providers: ProviderStatus[];
  initialRun: LlmRun | null;
}) {
  const [run, setRun] = useState<LlmRun | null>(initialRun);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anyConfigured = providers.some((p) => p.configured);

  async function execute() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/llm", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha ao executar.");
      } else {
        setRun(data.run);
      }
    } catch {
      setError("Erro de rede ao contatar o servidor.");
    } finally {
      setLoading(false);
    }
  }

  // Estrutura da matriz: probes (linhas) × provedores (colunas)
  const usedProviders = run
    ? providers.filter((p) => run.providers.includes(p.id as never))
    : providers.filter((p) => p.configured);

  const probeIds = run
    ? Array.from(new Set(run.results.map((r) => r.probeId)))
    : Object.keys(PROBE_TITLE);

  const cell = (probeId: string, provider: string) =>
    run?.results.find((r) => r.probeId === probeId && r.provider === provider);

  // Consenso por probe: quantos modelos resistiram
  const consensus = (probeId: string) => {
    if (!run) return null;
    const cells = run.results.filter((r) => r.probeId === probeId && r.ok);
    const resisted = cells.filter((r) => r.resisted).length;
    return { resisted, total: cells.length };
  };

  // Score de resistência por provedor
  const providerScore = (provider: string) => {
    if (!run) return null;
    const cells = run.results.filter((r) => r.provider === provider && r.ok);
    if (cells.length === 0) return null;
    const resisted = cells.filter((r) => r.resisted).length;
    return Math.round((resisted / cells.length) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Provedores */}
      <div className="grid gap-4 sm:grid-cols-3">
        {providers.map((p) => (
          <Card key={p.id} interactive>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm">{p.label}</p>
                {p.configured ? (
                  <Badge tone="lime">Conectado</Badge>
                ) : (
                  <Badge tone="neutral">Sem chave</Badge>
                )}
              </div>
              <p className="mt-1 font-mono text-xs text-graphite-veil">
                {p.model}
              </p>
              {!p.configured && (
                <a
                  href={p.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-prism-cyan hover:underline"
                >
                  Pegar chave grátis
                  <ExternalLink className="size-3" strokeWidth={1.5} />
                </a>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ConsensusNetwork providers={providers} active={loading} />

      {/* Ação */}
      <Card className="prism-glow">
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <BrainCircuit className="mt-0.5 size-5 shrink-0 text-prism-cyan" strokeWidth={1.5} />
            <div>
              <p className="text-sm text-bone-white">
                Red team cruzado sobre {usedProviders.length || "0"} modelo(s)
              </p>
              <p className="text-xs text-fog-blue">
                Dispara 5 sondagens seguras contra cada modelo conectado e compara a resistência.
              </p>
            </div>
          </div>
          <Button variant="primary" onClick={execute} disabled={loading || !anyConfigured} title="Dispara os testes de manipulação contra cada modelo conectado">
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
                Executando…
              </>
            ) : (
              "Executar red team"
            )}
          </Button>
        </CardContent>
      </Card>

      {!anyConfigured && (
        <p className="text-sm text-graphite-veil">
          Adicione ao menos uma chave no arquivo{" "}
          <code className="text-fog-blue">.env.local</code> e reinicie o servidor
          para habilitar a execução.
        </p>
      )}

      {error && (
        <div className="border border-prism-red/40 bg-prism-red/10 p-3 text-xs text-prism-red">
          {error}
        </div>
      )}

      {/* Matriz cruzada */}
      {run && (
        <Card>
          <CardHeader>
            <CardTitle>Matriz de resistência — resultados cruzados</CardTitle>
            <span className="text-xs text-graphite-veil">
              {new Date(run.startedAt).toLocaleString("pt-BR")}
            </span>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-3 text-left text-micro-caps text-graphite-veil">
                      Vetor / Sondagem
                    </th>
                    {usedProviders.map((p) => (
                      <th
                        key={p.id}
                        className="px-3 py-3 text-center text-micro-caps text-graphite-veil"
                      >
                        {p.label.split(" ")[0]}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-micro-caps text-graphite-veil">
                      Consenso
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {probeIds.map((pid) => {
                    const c = consensus(pid);
                    const sample = run.results.find((r) => r.probeId === pid);
                    return (
                      <tr key={pid} className="border-t border-ash-border/60">
                        <td className="px-5 py-2.5">
                          <p className="text-sm">{PROBE_TITLE[pid] ?? pid}</p>
                          <p className="text-xs text-graphite-veil">
                            {sample ? VECTOR_LABEL[sample.vector] : ""}
                          </p>
                        </td>
                        {usedProviders.map((p) => (
                          <Cell key={p.id} r={cell(pid, p.id)} />
                        ))}
                        <td className="px-4 py-2.5 text-center">
                          {c && (
                            <span
                              className={
                                c.resisted === c.total
                                  ? "text-prism-lime"
                                  : c.resisted === 0
                                    ? "text-prism-red"
                                    : "text-amber-400"
                              }
                            >
                              <span className="tabular-nums">
                                {c.resisted}/{c.total}
                              </span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Linha de score por provedor */}
                  <tr className="border-t border-ash-border bg-surface-2">
                    <td className="px-5 py-3 text-micro-caps text-graphite-veil">
                      Resistência do modelo
                    </td>
                    {usedProviders.map((p) => {
                      const score = providerScore(p.id);
                      return (
                        <td
                          key={p.id}
                          className="px-3 py-3 text-center text-sm font-medium tabular-nums"
                          style={{
                            color:
                              score === null
                                ? "var(--color-graphite-veil)"
                                : score >= 80
                                  ? "var(--color-prism-lime)"
                                  : score >= 50
                                    ? "#ffc22a"
                                    : "var(--color-prism-red)",
                          }}
                        >
                          {score === null ? "—" : `${score}%`}
                        </td>
                      );
                    })}
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-4 border-t border-ash-border px-5 py-3 text-xs text-graphite-veil">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-prism-lime" strokeWidth={1.5} />
                Resistiu
              </span>
              <span className="flex items-center gap-1.5">
                <XCircle className="size-3.5 text-prism-red" strokeWidth={1.5} />
                Ataque teve sucesso
              </span>
              <span className="flex items-center gap-1.5">
                <Ban className="size-3.5" strokeWidth={1.5} />
                Erro na chamada
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
