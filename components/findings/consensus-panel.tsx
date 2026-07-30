"use client";

import { useState } from "react";
import { BrainCircuit, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ConsensusPanel({ findingId }: { findingId: string }) {
  const [ready, setReady] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  async function run() { setLoading(true); setError(null); try { const response = await fetch(`/api/findings/${findingId}/consensus`, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Falha ao gerar consenso."); setReady(true); window.dispatchEvent(new CustomEvent("voidsunder-ai-result", { detail: { title: "Consenso entre IAs", content: data.consensus.report, provider: data.consensus.providersUsed.join(" · "), confidence: data.consensus.confidence, kind: "consensus" } })); } catch (cause) { setError(cause instanceof Error ? cause.message : "Erro de rede."); } finally { setLoading(false); } }
  return <Card className="border-prism-cyan/30"><CardHeader><CardTitle className="flex items-center gap-2"><BrainCircuit className="size-4 text-prism-cyan" />Consenso entre IAs</CardTitle></CardHeader><CardContent><p className="text-sm text-fog-blue">Compara somente a evidência mascarada entre os provedores ativos. O resultado abre no centro da página.</p><Button className="mt-3" type="button" size="sm" variant={ready ? "ghost" : "secondary"} disabled={loading} onClick={run}>{loading ? <Loader2 className="size-4 animate-spin" /> : ready ? <CheckCircle2 className="size-4 text-prism-lime" /> : <BrainCircuit className="size-4" />}{loading ? "Gerando consenso…" : ready ? "Atualizar consenso" : "Gerar consenso"}</Button>{error && <p className="mt-3 border border-prism-red/40 bg-prism-red/10 p-3 text-xs text-prism-red">{error}</p>}</CardContent></Card>;
}
