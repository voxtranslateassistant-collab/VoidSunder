import Link from "next/link";
import { FileText } from "lucide-react";

import { TopBar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SeverityPill } from "@/components/ui/severity-pill";
import { getScans, getFindingsByScan } from "@/lib/store";
import { SEVERITY_ORDER } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";
import { DeleteScanButton } from "@/components/scans/delete-scan-button";

export const metadata = { title: "Relatórios" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const scans = (await getScans()).filter((s) => s.status === "completed");

  const reports = await Promise.all(
    scans.map(async (s) => {
      const findings = await getFindingsByScan(s.id);
      const top = [...findings].sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.severity) -
          SEVERITY_ORDER.indexOf(b.severity),
      )[0];
      return { scan: s, findings, top };
    }),
  );

  return (
    <>
      <TopBar
        title="Relatórios"
        subtitle={
          reports.length
            ? `${reports.length} relatório(s) disponível(is)`
            : "Sem relatórios"
        }
      />
      <main className="tactical-grid flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] p-8">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-4">
                <EmptyState
                  title="Nenhum relatório gerado"
                  description="Cada scan concluído vira um relatório aqui, com resumo por severidade e plano de correção."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {reports.map(({ scan, findings, top }) => (
                <Card key={scan.id} interactive>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-bone-white normal-case">
                      <FileText
                        className="size-3.5 text-fog-blue"
                        strokeWidth={1.5}
                      />
                      {scan.assetName}
                    </CardTitle>
                    <span className="text-xs text-graphite-veil">
                      {formatRelativeTime(scan.startedAt)}
                    </span>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="font-mono text-xs break-all text-graphite-veil">
                      {scan.targetUrl}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {SEVERITY_ORDER.filter(
                        (s) => scan.findingsCount[s] > 0,
                      ).map((s) => (
                        <SeverityPill key={s} severity={s}>
                          <span className="tabular-nums">
                            {scan.findingsCount[s]}
                          </span>
                        </SeverityPill>
                      ))}
                      {findings.length === 0 && (
                        <span className="text-xs text-prism-lime">
                          Nenhum problema detectado
                        </span>
                      )}
                    </div>
                    {top && (
                      <p className="border-t border-ash-border pt-3 text-xs text-fog-blue">
                        Prioridade:{" "}
                        <Link
                          href={`/findings/${top.id}`}
                          className="text-bone-white hover:text-prism-cyan"
                        >
                          {top.title}
                        </Link>
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <a
                        href={`/api/reports/${scan.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-micro-caps text-fog-blue transition-colors hover:text-bone-white"
                      >
                        Abrir relatório
                      </a>
                      <DeleteScanButton scanId={scan.id} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
