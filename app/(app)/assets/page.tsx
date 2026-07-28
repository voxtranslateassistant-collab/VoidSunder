import Link from "next/link";
import { Radar, ChevronRight } from "lucide-react";

import { TopBar } from "@/components/layout/topbar";
import { Card, CardContent } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getAssets, getScans } from "@/lib/store";
import { ASSET_KIND_LABEL } from "@/lib/constants";
import { formatRelativeTime, shortUrl } from "@/lib/utils";

export const metadata = { title: "Alvos" };
export const dynamic = "force-dynamic";

const ENV_LABEL: Record<string, string> = {
  production: "Produção",
  staging: "Staging",
  development: "Desenvolvimento",
};

function riskTone(score: number): "red" | "amber" | "lime" {
  if (score >= 60) return "red";
  if (score >= 30) return "amber";
  return "lime";
}

export default async function AssetsPage() {
  const [assets, scans] = await Promise.all([getAssets(), getScans()]);

  // Último scan de cada alvo (scans já vêm ordenados do mais recente).
  const latestScanByAsset = new Map<string, string>();
  for (const s of scans) {
    if (!latestScanByAsset.has(s.assetId)) latestScanByAsset.set(s.assetId, s.id);
  }

  return (
    <>
      <TopBar
        title="Alvos"
        subtitle={
          assets.length
            ? `${assets.length} alvo(s) monitorado(s)`
            : "Nenhum alvo ainda"
        }
        action={
          <Link
            href="/scans/new"
            title="Iniciar uma nova varredura"
            className="inline-flex h-8 items-center gap-2 bg-bone-white px-3 text-xs font-medium text-pure-black transition-colors hover:bg-white"
          >
            <Radar className="size-4" strokeWidth={1.5} />
            Novo Scan
          </Link>
        }
      />
      <main className="tactical-grid flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] p-8">
          <div className="mb-6 border border-ash-border bg-surface-1 p-4 text-sm text-fog-blue">
            Esta é a lista dos <strong className="text-bone-white">alvos que
            você já escaneou</strong> — cada site/API vira um item aqui, com seu{" "}
            <strong className="text-bone-white">score de risco</strong> (0 = limpo,
            100 = grave). Clique numa linha para abrir o último scan daquele alvo.
          </div>

          <Card>
            <CardContent className="p-0">
              {assets.length === 0 ? (
                <EmptyState
                  title="Nenhum alvo cadastrado"
                  description="Um alvo é criado automaticamente na primeira vez que você escaneia uma URL em Novo Scan."
                />
              ) : (
                <Table className="table-fixed">
                  <thead>
                    <tr>
                      <Th>Alvo</Th>
                      <Th className="w-28">Tipo</Th>
                      <Th className="w-36">Ambiente</Th>
                      <Th className="w-20 text-right">Risco</Th>
                      <Th className="w-32 text-right">Último scan</Th>
                      <Th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a) => {
                      const scanId = latestScanByAsset.get(a.id);
                      const href = scanId ? `/scans/${scanId}` : "/scans";
                      return (
                        <Tr key={a.id} className="group cursor-pointer">
                          <Td className="py-2.5">
                            <Link href={href} className="block">
                              <p
                                className="truncate text-sm transition-colors group-hover:text-prism-cyan"
                                title={a.name}
                              >
                                {a.name}
                              </p>
                              <p
                                className="mt-0.5 truncate font-mono text-xs text-graphite-veil"
                                title={a.target}
                              >
                                {shortUrl(a.target)}
                              </p>
                            </Link>
                          </Td>
                          <Td className="py-2.5 text-fog-blue">
                            {ASSET_KIND_LABEL[a.kind]}
                          </Td>
                          <Td className="py-2.5 text-xs text-fog-blue">
                            {ENV_LABEL[a.environment] ?? a.environment}
                          </Td>
                          <Td className="py-2.5 text-right">
                            <Badge tone={riskTone(a.riskScore)}>
                              {a.riskScore}
                            </Badge>
                          </Td>
                          <Td className="py-2.5 text-right text-xs text-graphite-veil">
                            {a.lastScanAt ? formatRelativeTime(a.lastScanAt) : "—"}
                          </Td>
                          <Td className="py-2.5 text-right">
                            <Link href={href}>
                              <ChevronRight
                                className="ml-auto size-4 text-graphite-veil transition-colors group-hover:text-prism-cyan"
                                strokeWidth={1.5}
                              />
                            </Link>
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
