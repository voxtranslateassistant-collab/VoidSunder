import { Wrench, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Finding } from "@/types";

export function RemediationPanel({ finding }: { finding: Finding }) {
  const confidencePct = Math.round(finding.confidence * 100);

  return (
    <Card className="prism-glow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="size-3.5 text-prism-cyan" strokeWidth={1.5} />
          Análise e remediação
        </CardTitle>
        <span className="text-xs tabular-nums text-graphite-veil">
          {confidencePct}% de confiança
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-micro-caps text-graphite-veil">Como corrigir</p>
          <p className="mt-1.5 text-sm leading-relaxed text-bone-white">
            {finding.remediation}
          </p>
        </div>

        <div className="border-t border-ash-border pt-3">
          <div className="flex items-center justify-between">
            <span className="text-micro-caps text-graphite-veil">
              Confiança da detecção
            </span>
            <span className="text-xs tabular-nums text-fog-blue">
              {confidencePct}%
            </span>
          </div>
          <div className="mt-1.5 h-1 w-full bg-surface-4">
            <div
              className="h-full bg-prism-cyan transition-[width] duration-700"
              style={{ width: `${confidencePct}%` }}
            />
          </div>
        </div>

        <p className="flex items-start gap-2 border-t border-ash-border pt-3 text-xs leading-relaxed text-graphite-veil">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.5} />
          Detecção determinística a partir da resposta HTTP real do alvo — não é
          inferência de IA. A evidência capturada está registrada abaixo.
        </p>
      </CardContent>
    </Card>
  );
}
