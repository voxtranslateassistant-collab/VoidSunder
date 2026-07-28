import Link from "next/link";
import { TopBar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { JOB_PROFILE_LABEL, listJobs } from "@/lib/jobs";
import { formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Fila de Scans" };
export const dynamic = "force-dynamic";

export default async function ScansPage() {
  const scans = await listJobs();
  return <><TopBar title="Fila de Scans" subtitle={scans.length ? `${scans.length} job(s) registrado(s)` : "Nenhum job criado"} />
    <main className="tactical-grid flex-1 overflow-y-auto"><div className="mx-auto max-w-[1600px] p-8"><Card><CardContent className="p-0">
      {scans.length === 0 ? <EmptyState title="Nenhum job executado" description="Crie um job em Novo Scan; o worker fará a execução fora do painel." /> : <Table><thead><tr><Th>Ativo</Th><Th className="w-48">Perfil</Th><Th className="w-32">Status</Th><Th>Progresso</Th><Th className="w-24 text-right">Quando</Th></tr></thead><tbody>
        {scans.map((scan) => { const asset = Array.isArray(scan.assets) ? scan.assets[0] : scan.assets; return <Tr key={scan.id}><Td><Link href={`/scans/${scan.id}`} className="text-sm transition-colors hover:text-prism-cyan">{asset?.name ?? "Ativo"}</Link><p className="mt-0.5 max-w-xl truncate font-mono text-xs text-graphite-veil">{scan.target_url}</p></Td><Td className="text-fog-blue">{JOB_PROFILE_LABEL[scan.profile as keyof typeof JOB_PROFILE_LABEL]}</Td><Td><StatusDot status={scan.status} />{scan.error_text && <p className="mt-1 max-w-48 text-xs text-prism-red">{scan.error_text}</p>}</Td><Td><div className="w-36"><div className="h-1.5 overflow-hidden bg-surface-3"><div className="h-full bg-prism-cyan transition-all" style={{ width: `${scan.progress}%` }} /></div><p className="mt-1 text-xs text-graphite-veil">{scan.current_step ?? `${scan.progress}%`}</p></div></Td><Td className="text-right text-xs text-graphite-veil">{formatRelativeTime(scan.created_at)}</Td></Tr>; })}
      </tbody></Table>}
    </CardContent></Card></div></main></>;
}
