import { TopBar } from "@/components/layout/topbar";
import { NewScanForm } from "@/components/scans/new-scan-form";

export const metadata = { title: "Novo Scan" };

export default function NewScanPage() {
  return (
    <>
      <TopBar
        title="Novo Scan"
        subtitle="Escaneamento passivo de um alvo autorizado"
      />
      <main className="tactical-grid flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] p-8">
          <NewScanForm />
        </div>
      </main>
    </>
  );
}
