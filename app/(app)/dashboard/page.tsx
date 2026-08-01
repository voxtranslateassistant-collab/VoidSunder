import Link from "next/link";
import { Clock3, Radar, TriangleAlert } from "lucide-react";
import { TopBar } from "@/components/layout/topbar";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusDot } from "@/components/ui/status-dot";
import { Badge } from "@/components/ui/badge";
import { getOperationalOverview, JOB_PROFILE_LABEL } from "@/lib/jobs";

export const metadata = { title: "Painel" };
export const dynamic = "force-dynamic";

function relativeTime(value: string | null) {
  if (!value) return "Sem sinal registrado";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `há ${hours}h${minutes % 60 ? ` ${minutes % 60}min` : ""}`;
}

export default async function DashboardPage() {
  const overview = await getOperationalOverview();
  const workerOnline = Boolean(overview.workerLastSeenAt && Date.now() - new Date(overview.workerLastSeenAt).getTime() < 90_000);
  return <>
    <TopBar title="Painel" subtitle="Postura operacional em tempo real" action={<Link href="/scans/new" className="inline-flex h-8 items-center gap-2 bg-bone-white px-3 text-xs font-medium text-pure-black"><Radar className="size-4" />Novo Scan</Link>} />
    <main className="tactical-grid flex-1 overflow-y-auto"><div className="mx-auto max-w-[1600px] space-y-6 p-8">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Ativos em escopo" value={overview.assets} />
        <StatCard label="Jobs em execução" value={overview.active} accent="var(--color-prism-cyan)" />
        <StatCard label="Achados abertos" value={overview.findings} />
        <StatCard label="Críticos" value={overview.critical} accent="var(--color-prism-red)" />
      </section>

      {overview.alerts.length > 0 && <section className="space-y-2" aria-label="Alertas operacionais">
        {overview.alerts.map((alert) => <div key={alert.id} className={`flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between ${alert.tone === "red" ? "border-prism-red/50 bg-prism-red/10" : "border-[#ffc22a]/50 bg-[#ffc22a]/8"}`}>
          <div className="flex gap-3"><TriangleAlert className={`mt-0.5 size-5 shrink-0 ${alert.tone === "red" ? "text-prism-red" : "text-[#ffc22a]"}`} /><div><p className="text-sm text-bone-white">{alert.title}</p><p className="mt-1 text-xs text-fog-blue">{alert.description}</p></div></div>
          <Link href="/scans" className="shrink-0 text-xs text-prism-cyan hover:text-bone-white">Abrir fila</Link>
        </div>)}
      </section>}

      <Card><CardHeader><div><CardTitle className="flex items-center gap-2"><Clock3 className="size-4 text-prism-cyan" />Estado da operação</CardTitle><p className="mt-1 text-xs text-graphite-veil">O worker envia um sinal a cada 30 segundos. Sem sinal recente, a fila deve ser revisada no Railway.</p></div><Badge tone={workerOnline ? "lime" : "red"}>{workerOnline ? "Worker online" : "Sem sinal do worker"}</Badge></CardHeader><CardContent className="flex flex-wrap gap-x-8 gap-y-2 text-sm"><p><span className="text-graphite-veil">Último sinal:</span> <span className="text-bone-white">{relativeTime(overview.workerLastSeenAt)}</span></p><p><span className="text-graphite-veil">Última conclusão:</span> <span className="text-bone-white">{relativeTime(overview.latestCompletedAt)}</span></p><p><span className="text-graphite-veil">Fila ativa:</span> <span className="text-bone-white">{overview.active} job{overview.active === 1 ? "" : "s"}</span>{overview.oldestPendingAt && <> <span className="text-graphite-veil">desde {relativeTime(overview.oldestPendingAt)}</span></>}</p></CardContent></Card>
      <Card><CardHeader><CardTitle>Execuções recentes</CardTitle></CardHeader><CardContent>{overview.recent.length === 0 ? <EmptyState title="Nenhum job criado" description="Cadastre um ativo em Novo Scan para registrar escopo e iniciar a fila." /> : <div className="space-y-3">{overview.recent.map((job) => { const asset = Array.isArray(job.assets) ? job.assets[0] : job.assets; return <Link key={job.id} href={`/scans/${job.id}`} className="flex items-center justify-between gap-4 border-b border-ash-border pb-3 last:border-0"><div><p className="text-sm">{asset?.name ?? job.target_url}</p><p className="mt-1 text-xs text-graphite-veil">{JOB_PROFILE_LABEL[job.profile as keyof typeof JOB_PROFILE_LABEL]} · {job.current_step ?? `${job.progress}%`}</p></div><StatusDot status={job.status} /></Link>; })}</div>}</CardContent></Card>
    </div></main>
  </>;
}
