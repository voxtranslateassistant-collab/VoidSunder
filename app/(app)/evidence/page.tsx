import { TopBar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyEvidenceButton } from "@/components/evidence/copy-evidence-button";
import { getOperationalEvidence } from "@/lib/operational-data";
import { formatBytes, formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Cofre de Provas" };
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { http_headers: "Cabeçalhos HTTP", http_response: "Resposta HTTP", cookie: "Cookie", config: "Configuração" };

export default async function EvidencePage() {
  const evidence = await getOperationalEvidence();
  return (
    <>
      <TopBar title="Cofre de Provas" subtitle={evidence.length ? `${evidence.length} artefato(s) capturado(s)` : "Cofre vazio"} />
      <main className="tactical-grid flex-1 overflow-y-auto"><div className="mx-auto max-w-[1600px] p-8">
        <div className="mb-6 border border-ash-border bg-surface-1 p-4 text-sm text-fog-blue">Aqui ficam as <strong className="text-bone-white">provas</strong> que a plataforma capturou durante os scans — os cabeçalhos HTTP reais, os trechos de arquivos expostos e os segredos redigidos. É o que comprova cada achado.</div>
        {evidence.length === 0 ? <Card><CardContent className="py-4"><EmptyState title="Nenhuma evidência coletada" description="Cada scan captura os cabeçalhos e trechos reais que comprovam os achados. Execute um scan para começar." /></CardContent></Card> : <div className="space-y-4">{evidence.map((e) => <Card key={e.id}><CardContent><div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm">{e.label}</p><div className="flex items-center gap-3"><span className="text-xs text-graphite-veil">{KIND_LABEL[e.kind] ?? e.kind} · {formatBytes(e.sizeBytes)} · {formatRelativeTime(e.capturedAt)}</span><CopyEvidenceButton content={e.content} /></div></div><pre className="mt-3 max-h-64 overflow-auto border border-ash-border/60 bg-surface-0 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fog-blue">{e.content}</pre></CardContent></Card>)}</div>}
      </div></main>
    </>
  );
}
