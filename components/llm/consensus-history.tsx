import { GitCompareArrows } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ConsensusHistoryEntry } from "@/lib/llm/consensus-history";

function targetLabel(target: string | null) {
  if (!target) return "Scan removido";
  try { return new URL(target).hostname; } catch { return target; }
}

export function ConsensusHistory({ entries }: { entries: ConsensusHistoryEntry[] }) {
  if (entries.length === 0) return null;
  const previousByTarget = new Map<string, ConsensusHistoryEntry>();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2"><GitCompareArrows className="size-4 text-prism-cyan" />Histórico de consensos de IA</CardTitle>
          <p className="mt-1 text-xs text-graphite-veil">Cada consenso compara análises de provedores configurados sobre um job. A variação é comparada com a execução anterior do mesmo alvo.</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => {
          const key = entry.target ?? entry.id;
          const previous = previousByTarget.get(key);
          previousByTarget.set(key, entry);
          const delta = entry.confidence !== null && previous && previous.confidence !== null ? entry.confidence - previous.confidence : null;
          return <div key={entry.id} className="flex flex-col gap-3 border border-ash-border bg-surface-1 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm text-bone-white">{targetLabel(entry.target)}</p>
              <p className="mt-1 text-xs text-graphite-veil">{new Date(entry.createdAt).toLocaleString("pt-BR")} · {entry.providers.length} provedor{entry.providers.length === 1 ? "" : "es"} · {entry.divergenceCount} divergência{entry.divergenceCount === 1 ? "" : "s"}</p>
              <p className="mt-1 truncate text-xs text-fog-blue">{entry.providers.join(", ") || "Sem resposta de provedor"}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={entry.state === "cross_validated" ? "lime" : "amber"}>{entry.state === "cross_validated" ? "Validado por múltiplas IAs" : entry.state === "single_provider" ? "1 IA respondeu" : entry.state ?? "Processado"}</Badge>
              <span className="text-sm tabular-nums text-bone-white">{entry.confidence === null ? "—" : `${entry.confidence}%`}</span>
              {delta !== null && <span className={delta >= 0 ? "text-xs text-prism-lime" : "text-xs text-prism-red"}>{delta >= 0 ? "+" : ""}{delta} pp</span>}
            </div>
          </div>;
        })}
      </CardContent>
    </Card>
  );
}
