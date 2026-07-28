import { TopBar } from "@/components/layout/topbar";
import { FindingsExplorer } from "@/components/findings/findings-explorer";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { getFindings } from "@/lib/store";

export const metadata = { title: "Achados" };
export const dynamic = "force-dynamic";

export default async function FindingsPage() {
  const findings = await getFindings();
  const openCount = findings.filter(
    (f) => f.status === "open" || f.status === "confirmed",
  ).length;

  return (
    <>
      <TopBar
        title="Achados"
        subtitle={
          findings.length
            ? `${findings.length} achados · ${openCount} pendentes`
            : "Nenhum achado ainda"
        }
      />
      <main className="tactical-grid flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] p-8">
          {findings.length === 0 ? (
            <Card>
              <CardContent className="py-4">
                <EmptyState
                  title="Nenhum achado registrado"
                  description="Execute um scan em Novo Scan para popular esta lista com achados reais."
                />
              </CardContent>
            </Card>
          ) : (
            <FindingsExplorer findings={findings} />
          )}
        </div>
      </main>
    </>
  );
}
