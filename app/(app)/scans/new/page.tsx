import { TopBar } from "@/components/layout/topbar";
import { NewScanForm } from "@/components/scans/new-scan-form";
import { ScanChoiceGuide } from "@/components/scans/scan-choice-guide";

export const metadata = { title: "Novo Scan" };

export default function NewScanPage() {
  return (
    <>
      <TopBar
        title="Novo Scan"
        subtitle="Escaneamento passivo de um alvo autorizado"
      />
      <main className="tactical-grid flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] space-y-6 p-8">
          <NewScanForm />
          <ScanChoiceGuide />
        </div>
      </main>
    </>
  );
}
