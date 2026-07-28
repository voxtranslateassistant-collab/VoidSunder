import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TopBar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { SeverityPill } from "@/components/ui/severity-pill";
import { StatusDot } from "@/components/ui/status-dot";
import { EmptyState } from "@/components/ui/empty-state";
import { getJobDetail, JOB_PROFILE_LABEL } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getJobDetail(id);
  if (!detail) notFound();
  const { job, findings } = detail;
  const asset = Array.isArray(job.assets) ? job.assets[0] : job.assets;
  return <><TopBar title={`Job · ${asset?.name ?? "Ativo"}`} subtitle={job.target_url} />
    <main className="tactical-grid flex-1 overflow-y-auto"><div className="mx-auto max-w-[1600px] space-y-6 p-8">
      <Link href="/scans" className="inline-flex items-center gap-2 text-xs text-fog-blue transition-colors hover:text-bone-white"><ArrowLeft className="size-3.5" />Voltar para fila</Link>
      <Card><CardContent className="flex flex-wrap items-center gap-5 py-5"><StatusDot status={job.status} /><span className="text-sm text-fog-blue">{JOB_PROFILE_LABEL[job.profile as keyof typeof JOB_PROFILE_LABEL]}</span><span className="text-xs text-graphite-veil">{job.current_step ?? "Aguardando"} · {job.progress}%</span></CardContent></Card>
      <section className="grid gap-4 md:grid-cols-3">{(job.scan_steps ?? []).slice(-6).reverse().map((step: { id: string; name: string; status: string; message: string | null }) => <Card key={step.id}><CardContent className="py-4"><p className="text-sm">{step.name}</p><p className="mt-1 text-xs text-graphite-veil">{step.message ?? step.status}</p></CardContent></Card>)}</section>
      <Card><CardHeader><CardTitle>Achados ({findings.length})</CardTitle></CardHeader><CardContent className="p-0">{findings.length === 0 ? <EmptyState title={job.status === "completed" ? "Nenhum achado confirmado" : "Ainda não há achados"} description="Os achados aparecem quando o worker concluir as etapas de validação." /> : <Table><thead><tr><Th>Achado</Th><Th className="w-28">Severidade</Th><Th className="w-24 text-right">CVSS</Th></tr></thead><tbody>{findings.map((finding: { id: string; title: string; severity: "critical" | "high" | "medium" | "low" | "info"; cvss: number | null }) => <Tr key={finding.id}><Td><Link href={`/findings/${finding.id}`} className="hover:text-prism-cyan">{finding.title}</Link></Td><Td><SeverityPill severity={finding.severity} /></Td><Td className="text-right">{finding.cvss?.toFixed(1) ?? "—"}</Td></Tr>)}</tbody></Table>}</CardContent></Card>
    </div></main></>;
}
