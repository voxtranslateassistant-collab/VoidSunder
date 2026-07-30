"use client";

import { useState } from "react";
import { BrainCircuit, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ai/markdown";

type Consensus = { confidence: number; state: string; providersUsed: string[]; divergences: string[]; report: string };

export function ConsensusPanel({ findingId }: { findingId: string }) {
  const [result, setResult] = useState<Consensus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    setLoading(true); setError(null);
    try { const response = await fetch(`/api/findings/${findingId}/consensus`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Falha ao gerar consenso."); setResult(data.consensus); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Erro de rede."); }
    finally { setLoading(false); }
  }
  return <Card className="border-prism-cyan/30"><CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="size-4 text-prism-cyan" />Consenso entre IAs</CardTitle>{result && <span className="text-xs text-prism-cyan">{Math.round(result.confidence * 100)}% de confiança</span>}</CardHeader><CardContent>{result ? <><div className="mb-4 flex flex-wrap gap-2">{result.providersUsed.map((provider) => <span key={provider} className="border border-prism-cyan/40 px-2 py-1 text-xs text-prism-cyan">{provider}</span>)}</div>{result.divergences.map((item) => <p key={item} className="mb-3 text-xs text-amber-400">{item}</p>)}<Markdown text={result.report} /><Button className="mt-4" variant="ghost" size="sm" disabled={loading} onClick={run}>{loading ? <Loader2 className="size-3.5 animate-spin" /> : <BrainCircuit className="size-3.5" />}Atualizar consenso</Button></> : <div className="flex flex-col items-start gap-3"><p className="text-sm text-fog-blue">Envia a evidência mascarada para cada provedor ativo, compara respostas e registra a divergência e a confiança da conclusão.</p><Button type="button" size="sm" variant="secondary" disabled={loading} onClick={run}>{loading ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}Gerar consenso</Button></div>}{error && <p className="mt-3 border border-prism-red/40 bg-prism-red/10 p-3 text-xs text-prism-red">{error}</p>}</CardContent></Card>;
}
