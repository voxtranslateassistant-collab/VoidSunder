import { TopBar } from "@/components/layout/topbar";
import { ProviderKeyManager } from "@/components/llm/provider-key-manager";

export const metadata = { title: "Integrações" };
export const dynamic = "force-dynamic";

export default function IntegrationsPage() {
  return (
    <>
      <TopBar title="Integrações de IA" subtitle="Chaves protegidas no servidor" />
      <main className="tactical-grid flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-6 p-8">
          <div className="border border-ash-border bg-surface-1 p-4 text-sm text-fog-blue">
            Cofre criptográfico ativo: cada chave passa por validação quando o provedor suporta esse teste e é armazenada apenas de forma criptografada no servidor. O valor original nunca é exibido novamente.
          </div>
          <ProviderKeyManager />
        </div>
      </main>
    </>
  );
}
