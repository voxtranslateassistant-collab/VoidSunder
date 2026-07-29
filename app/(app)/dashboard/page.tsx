import Link from "next/link";
import { Radar } from "lucide-react";
import { TopBar } from "@/components/layout/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDot } from "@/components/ui/status-dot";
import { getOperationalOverview, JOB_PROFILE_LABEL } from "@/lib/jobs";

export const metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const overview = await getOperationalOverview();
  return <><TopBar title="Painel" subtitle="Postura operacional em tempo real" action={<Link href="/scans/new" className="inline-flex h-8 items-center gap-2 bg-bone-white px-3 text-xs font-medium text-pure-black"><Radar className="size-4" />Novo Scan</Link>} />
    <main className="tactical-grid flex-1 overflow-y-auto"><div className="mx-auto max-w-[1600px] space-y-6 p-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Ativos em escopo" value={overview.assets} /><StatCard label="Jobs em execução" value={overview.active} accent="var(--color-prism-cyan)" /><StatCard label="Achados abertos" value={overview.findings} /><StatCard label="Críticos" value={overview.critical} accent="var(--color-prism-red)" /></section>
      <Card><CardHeader><CardTitle>Execuções recentes</CardTitle></CardHeader><CardContent>{overview.recent.length === 0 ? <EmptyState title="Nenhum job criado" description="Cadastre um ativo em Novo Scan para registrar escopo e iniciar a fila." /> : <div className="space-y-3">{overview.recent.map((job) => { const asset = Array.isArray(job.assets) ? job.assets[0] : job.assets; return <Link key={job.id} href={`/scans/${job.id}`} className="flex items-center justify-between gap-4 border-b border-ash-border pb-3 last:border-0"><div><p className="text-sm">{asset?.name ?? job.target_url}</p><p className="mt-1 text-xs text-graphite-veil">{JOB_PROFILE_LABEL[job.profile as keyof typeof JOB_PROFILE_LABEL]} · {job.current_step ?? `${job.progress}%`}</p></div><StatusDot status={job.status} /></Link>; })}</div>}</CardContent></Card>
    </div></main></>;
}
