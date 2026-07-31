import Link from "next/link";
import { Boxes, Radar } from "lucide-react";

import { TopBar } from "@/components/layout/topbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, Td, Th, Tr } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils";

export const metadata = { title: "Inventário" };
export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  dns: "DNS", technology: "Tecnologia", route: "Rota", script: "JavaScript", api_surface: "API", transport: "Transporte", public_file: "Arquivo público",
};

type Observation = {
  id: string; category: string; name: string; value_masked: string | null; source: string; confidence: number; observed_at: string;
  assets: { name: string; target: string } | { name: string; target: string }[] | null;
};

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_observations")
    .select("id, category, name, value_masked, source, confidence, observed_at, assets(name, target)")
    .order("observed_at", { ascending: false });
  if (error) throw error;
  const observations = (data ?? []) as Observation[];
  const assets = new Set(observations.map((observation) => {
    const asset = Array.isArray(observation.assets) ? observation.assets[0] : observation.assets;
    return asset?.target ?? asset?.name ?? observation.id;
  }));

  return <>
    <TopBar title="Inventário" subtitle="Superfícies observadas em scans autorizados" action={<Link href="/scans/new" className="inline-flex h-8 items-center gap-2 bg-bone-white px-3 text-xs font-medium text-pure-black transition-colors hover:bg-white"><Radar className="size-4" strokeWidth={1.5} />Atualizar com scan</Link>} />
    <main className="tactical-grid flex-1 overflow-y-auto"><div className="mx-auto max-w-[1600px] p-8">
      <div className="mb-6 grid gap-4 md:grid-cols-3"><Metric label="Ativos observados" value={assets.size} /><Metric label="Observações" value={observations.length} /><Metric label="Cobertura atual" value={observations.length ? "Web" : "Aguardando"} /></div>
      <Card><CardHeader><div><CardTitle>Superfícies confirmadas</CardTitle><p className="mt-1 text-xs text-fog-blue">Dados coletados pelo worker somente dentro do escopo aprovado. Valores sensíveis permanecem mascarados.</p></div></CardHeader><CardContent className="p-0">
        {observations.length === 0 ? <EmptyState title="Ainda não há observações" description="Conclua um Reconhecimento Web autorizado para registrar status HTTP, tecnologias e rotas iniciais." /> : <Table className="table-fixed"><thead><tr><Th>Ativo</Th><Th className="w-32">Categoria</Th><Th>Observação</Th><Th>Valor</Th><Th className="w-32">Origem</Th><Th className="w-28 text-right">Observado</Th></tr></thead><tbody>{observations.map((observation) => {
          const asset = Array.isArray(observation.assets) ? observation.assets[0] : observation.assets;
          return <Tr key={observation.id}><Td className="py-3"><p className="truncate text-sm" title={asset?.name}>{asset?.name ?? "Ativo removido"}</p><p className="mt-0.5 truncate font-mono text-xs text-graphite-veil">{asset?.target ?? "—"}</p></Td><Td className="py-3"><Badge tone="cyan">{CATEGORY_LABEL[observation.category] ?? observation.category}</Badge></Td><Td className="py-3 text-sm text-bone-white">{observation.name}</Td><Td className="py-3 font-mono text-xs text-fog-blue">{observation.value_masked ?? "Não divulgado"}</Td><Td className="py-3 text-xs text-fog-blue">{observation.source}</Td><Td className="py-3 text-right text-xs text-graphite-veil">{formatRelativeTime(observation.observed_at)}</Td></Tr>;
        })}</tbody></Table>}
      </CardContent></Card>
    </div></main>
  </>;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent className="flex items-center gap-3"><Boxes className="size-4 text-prism-cyan" strokeWidth={1.5} /><div><p className="text-micro-caps text-graphite-veil">{label}</p><p className="mt-1 text-xl text-bone-white">{value}</p></div></CardContent></Card>;
}
