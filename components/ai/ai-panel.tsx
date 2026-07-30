"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function AiPanel({ endpoint, initialText, title, cta, responseKey }: { endpoint: string; initialText: string | null; title: string; cta: string; responseKey: "report" | "note" }) {
  const [ready, setReady] = useState(Boolean(initialText));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    setLoading(true); setError(null);
    try { const response = await fetch(endpoint, { method: "POST" }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Falha na análise."); const content = data[responseKey]; setReady(true); window.dispatchEvent(new CustomEvent("voidsunder-ai-result", { detail: { title, content, provider: data.provider ?? null, kind: "analysis" } })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Erro de rede ao contatar o servidor."); }
    finally { setLoading(false); }
  }
  return <Card className="prism-glow"><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="size-3.5 text-prism-cyan" />{title}</CardTitle></CardHeader><CardContent><p className="text-sm text-fog-blue">A resposta aparecerá no centro da página, junto das evidências, e poderá ser copiada.</p><Button className="mt-3" variant={ready ? "ghost" : "primary"} size="sm" onClick={run} disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : ready ? <CheckCircle2 className="size-4 text-prism-lime" /> : <Sparkles className="size-4" />}{loading ? "Analisando…" : ready ? "Gerar nova análise" : cta}</Button>{error && <p className="mt-3 border border-prism-red/40 bg-prism-red/10 p-3 text-xs text-prism-red">{error}</p>}</CardContent></Card>;
}
