"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "./markdown";

export function AiPanel({
  endpoint,
  initialText,
  title,
  cta,
  responseKey,
}: {
  endpoint: string;
  initialText: string | null;
  title: string;
  cta: string;
  /** chave do JSON de resposta: "report" ou "note". */
  responseKey: "report" | "note";
}) {
  const [text, setText] = useState<string | null>(initialText);
  const [provider, setProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Falha na análise.");
      } else {
        setText(data[responseKey]);
        setProvider(data.provider ?? null);
      }
    } catch {
      setError("Erro de rede ao contatar o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="prism-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-prism-cyan" strokeWidth={1.5} />
          {title}
        </CardTitle>
        {provider && (
          <span className="text-xs text-graphite-veil">{provider}</span>
        )}
      </CardHeader>
      <CardContent>
        {text ? (
          <>
            <Markdown text={text} />
            <div className="mt-4 border-t border-ash-border pt-3">
              <Button variant="ghost" size="sm" onClick={run} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" strokeWidth={1.5} />
                    Regerando…
                  </>
                ) : (
                  "Regerar análise"
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-fog-blue">
              A IA vai ler os achados reais deste alvo e produzir a análise.
            </p>
            <Button variant="primary" size="sm" onClick={run} disabled={loading} title="Usa sua API key para analisar os achados com IA">
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" strokeWidth={1.5} />
                  Analisando…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" strokeWidth={1.5} />
                  {cta}
                </>
              )}
            </Button>
          </div>
        )}
        {error && (
          <div className="mt-3 border border-prism-red/40 bg-prism-red/10 p-3 text-xs text-prism-red">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
