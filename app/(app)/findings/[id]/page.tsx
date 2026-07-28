import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TopBar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SeverityPill } from "@/components/ui/severity-pill";
import { RemediationPanel } from "@/components/findings/remediation-panel";
import { AiPanel } from "@/components/ai/ai-panel";
import { EvidenceList } from "@/components/findings/evidence-list";

import { getFindingById, getEvidenceByFinding, getScanById } from "@/lib/store";
import {
  FINDING_STATUS_LABEL,
  ENGINE_LABEL,
  SCAN_PROFILE_LABEL,
} from "@/lib/constants";
import { formatRelativeTime, shortUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const finding = await getFindingById(id);
  return { title: finding?.title ?? "Achado não encontrado" };
}

export default async function FindingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const finding = await getFindingById(id);
  if (!finding) notFound();

  const [evidence, scan] = await Promise.all([
    getEvidenceByFinding(finding.id),
    getScanById(finding.scanId),
  ]);

  const meta: { label: string; value: string }[] = [
    { label: "Alvo", value: finding.assetName },
    { label: "Endpoint", value: finding.endpoint },
    { label: "Verificação", value: ENGINE_LABEL[finding.engine] },
    { label: "CWE", value: finding.cwe ?? "—" },
    { label: "Categoria OWASP", value: finding.owaspCategory ?? "—" },
    { label: "CVSS", value: finding.cvss?.toFixed(1) ?? "—" },
    {
      label: "Scan de origem",
      value: scan ? SCAN_PROFILE_LABEL[scan.profile] : "—",
    },
    { label: "Detectado", value: formatRelativeTime(finding.detectedAt) },
  ];

  return (
    <>
      <TopBar
        title={finding.title}
        subtitle={`${finding.assetName} · ${shortUrl(finding.endpoint, 60)}`}
      />

      <main className="tactical-grid flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] space-y-6 p-8">
          <Link
            href="/findings"
            className="inline-flex items-center gap-2 text-xs text-fog-blue transition-colors hover:text-bone-white"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.5} />
            Voltar para Findings
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <SeverityPill severity={finding.severity} />
            <Badge tone={finding.status === "remediated" ? "lime" : "neutral"}>
              {FINDING_STATUS_LABEL[finding.status]}
            </Badge>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-bone-white">
                    {finding.summary}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Detalhes técnicos</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                    {meta.map((item) => (
                      <div key={item.label}>
                        <dt className="text-micro-caps text-graphite-veil">
                          {item.label}
                        </dt>
                        <dd className="mt-1 text-sm break-words text-bone-white">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>

              <EvidenceList evidence={evidence} />
            </div>

            <div className="space-y-6">
              <RemediationPanel finding={finding} />
              <AiPanel
                endpoint={`/api/findings/${finding.id}/analyze`}
                initialText={finding.aiNote}
                title="Análise aprofundada por IA"
                cta="Analisar com IA"
                responseKey="note"
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
