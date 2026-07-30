"use client";

import { useEffect, useRef, useState } from "react";
import { BrainCircuit, Check, Copy, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/ai/markdown";

type Generated = { title: string; content: string; provider?: string | null; confidence?: number | null; kind: "analysis" | "consensus" };

export function FindingAiGeneratedResult({ initialText }: { initialText: string | null }) {
  const [result, setResult] = useState<Generated | null>(initialText ? { title: "Análise aprofundada por IA", content: initialText, kind: "analysis" } : null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const onResult = (event: Event) => {
      setResult((event as CustomEvent<Generated>).detail);
      window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 30);
    };
    window.addEventListener("voidsunder-ai-result", onResult);
    return () => window.removeEventListener("voidsunder-ai-result", onResult);
  }, []);
  if (!result) return null;
  const content = result.content;
  async function copy() { await navigator.clipboard.writeText(content); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
  const Icon = result.kind === "consensus" ? BrainCircuit : Sparkles;
  return <section ref={ref}><Card className="border-prism-cyan/40 prism-glow"><CardHeader><CardTitle className="flex items-center gap-2"><Icon className="size-4 text-prism-cyan" />{result.title}</CardTitle><div className="flex items-center gap-3 text-xs text-graphite-veil">{result.provider && <span>{result.provider}</span>}{result.confidence !== null && result.confidence !== undefined && <span>{Math.round(result.confidence * 100)}% de confiança</span>}<Button type="button" variant="secondary" size="sm" onClick={copy}>{copied ? <Check className="size-3.5 text-prism-lime" /> : <Copy className="size-3.5" />}{copied ? "Copiado" : "Copiar conteúdo"}</Button></div></CardHeader><CardContent><Markdown text={result.content} /></CardContent></Card></section>;
}
