import Link from "next/link";
import { CheckCircle2, CircleDashed, PlusCircle, RotateCcw } from "lucide-react";
import { SeverityPill } from "@/components/ui/severity-pill";
import type { RetestComparison } from "@/lib/jobs";

export function RetestComparisonPanel({ comparison }: { comparison: RetestComparison | null }) {
  if (!comparison) return null;
  const groups = [
    { label: "Corrigidos", items: comparison.resolved, icon: CheckCircle2, color: "text-prism-green", description: "Presentes no scan original e ausentes no reteste." },
    { label: "Permanecem", items: comparison.retained, icon: CircleDashed, color: "text-prism-amber", description: "Continuam presentes após o reteste." },
    { label: "Novos", items: comparison.introduced, icon: PlusCircle, color: "text-prism-red", description: "Não estavam no scan original." },
  ];
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-bone-white"><RotateCcw className="size-4 text-prism-cyan" />Comparativo de reteste</div>
      <div className="grid gap-4 lg:grid-cols-3">
        {groups.map(({ label, items, icon: Icon, color, description }) => (
          <div key={label} className="border border-ash-border bg-surface-1 p-4">
            <div className="flex items-center justify-between"><span className="text-sm text-bone-white">{label}</span><Icon className={`size-4 ${color}`} /></div>
            <p className="mt-2 text-3xl font-medium text-bone-white">{items.length}</p>
            <p className="mt-2 text-xs leading-relaxed text-graphite-veil">{description}</p>
            {items.slice(0, 4).map((finding) => <div key={finding.id} className="mt-3 flex items-start justify-between gap-2 border-t border-ash-border pt-3"><Link href={`/findings/${finding.id}`} className="text-xs text-fog-blue hover:text-prism-cyan">{finding.title}</Link><SeverityPill severity={finding.severity} /></div>)}
          </div>
        ))}
      </div>
      <p className="text-xs text-graphite-veil">Comparado com o job original <Link href={`/scans/${comparison.originalJobId}`} className="text-prism-cyan hover:text-bone-white">abrir job</Link>. A correspondência considera título e endpoint do achado.</p>
    </section>
  );
}
