import { TopBar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScanQueue } from "@/components/scans/scan-queue";
import { listJobs } from "@/lib/jobs";

export const metadata = { title: "Fila de Scans" };
export const dynamic = "force-dynamic";

export default async function ScansPage() {
  const scans = await listJobs();
  return (
    <>
      <TopBar title="Fila de Scans" subtitle={scans.length ? `${scans.length} job(s) registrado(s)` : "Nenhum job criado"} />
      <main className="tactical-grid flex-1 overflow-y-auto"><div className="mx-auto max-w-[1600px] p-8"><Card><CardContent className="p-0">
        {scans.length === 0 ? <EmptyState title="Nenhum job executado" description="Crie um job em Novo Scan; o worker fará a execução fora do painel." /> : <ScanQueue initialJobs={scans as never} />}
      </CardContent></Card></div></main>
    </>
  );
}
