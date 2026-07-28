import { FileText, Cookie, Settings2, FileCode2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import type { Evidence } from "@/types";

const ICONS = {
  http_headers: FileText,
  http_response: FileCode2,
  cookie: Cookie,
  config: Settings2,
} as const;

const KIND_LABEL: Record<Evidence["kind"], string> = {
  http_headers: "Cabeçalhos HTTP",
  http_response: "Resposta HTTP",
  cookie: "Cookie",
  config: "Configuração",
};

export function EvidenceList({ evidence }: { evidence: Evidence[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Evidências capturadas</CardTitle>
        <span className="text-xs tabular-nums text-graphite-veil">
          {evidence.length}
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {evidence.length === 0 ? (
          <EmptyState
            title="Nenhuma evidência anexada"
            description="Artefatos capturados durante o scan aparecem aqui."
          />
        ) : (
          <ul>
            {evidence.map((e) => {
              const Icon = ICONS[e.kind];
              return (
                <li
                  key={e.id}
                  className="border-b border-ash-border/60 px-5 py-3.5 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className="size-4 shrink-0 text-fog-blue"
                      strokeWidth={1.5}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{e.label}</p>
                      <p className="mt-0.5 text-xs text-graphite-veil">
                        {KIND_LABEL[e.kind]} · {formatBytes(e.sizeBytes)} ·{" "}
                        {formatRelativeTime(e.capturedAt)}
                      </p>
                    </div>
                  </div>
                  <pre className="mt-2.5 max-h-40 overflow-auto border border-ash-border/60 bg-surface-0 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fog-blue">
                    {e.content}
                  </pre>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
