import Link from "next/link";
import { Download, ExternalLink, FileText } from "lucide-react";
import { TopBar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SeverityPill } from "@/components/ui/severity-pill";
import { getOperationalFindings } from "@/lib/operational-data";

export const metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const findings = await getOperationalFindings();
  const groups = Object.values(Object.groupBy(findings, (finding) => finding.assetName));
  return <><TopBar title="Relatórios" subtitle="Resumo comercial baseado nos achados persistidos" />
    <main className="tactical-grid flex-1 overflow-y-auto"><div className="mx-auto max-w-[1600px] p-8">
      {groups.length === 0 ? <Card><CardContent><EmptyState title="Sem achados para relatar" description="Conclua um scan autorizado para gerar o resumo técnico e executivo." /></CardContent></Card> : <div className="grid gap-4 md:grid-cols-2">{groups.map((items) => {
        const report = items ?? [];
        const asset = report[0]?.assetName ?? "Ativo";
        const latestScanId = report[0]?.scanId;
        return <Card key={asset} interactive><CardHeader><CardTitle className="flex items-center gap-2 text-bone-white normal-case"><FileText className="size-4 text-prism-cyan" />{asset}</CardTitle><span className="text-xs text-graphite-veil">{report.length} achado(s)</span></CardHeader><CardContent className="space-y-3"><div className="flex flex-wrap gap-2">{report.slice(0, 5).map((finding) => <SeverityPill key={finding.id} severity={finding.severity}>{finding.severity}</SeverityPill>)}</div><p className="text-xs text-fog-blue">Prioridade: {report[0]?.title}</p><div className="flex flex-wrap gap-4"><Link href={`/findings/${report[0]?.id}`} className="text-micro-caps text-prism-cyan hover:text-bone-white">Abrir achado prioritário</Link>{latestScanId && <><Link href={`/api/reports/${latestScanId}`} target="_blank" className="inline-flex items-center gap-1 text-micro-caps text-bone-white hover:text-prism-cyan">Abrir relatório completo <ExternalLink className="size-3" /></Link><Link href={`/api/reports/${latestScanId}?format=pdf`} className="inline-flex items-center gap-1 text-micro-caps text-bone-white hover:text-prism-cyan">Baixar PDF <Download className="size-3" /></Link></>}</div></CardContent></Card>;
      })}</div>}
    </div></main>
  </>;
}
