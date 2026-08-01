import { TopBar } from "@/components/layout/topbar";
import { LlmLab } from "@/components/llm/llm-lab";
import { configuredProviders, PROVIDERS } from "@/lib/llm/providers";
import { getRecentLlmRuns } from "@/lib/llm/runs";
import { getRecentConsensusHistory } from "@/lib/llm/consensus-history";
import { ConsensusHistory } from "@/components/llm/consensus-history";

export const metadata = { title: "Lab de IA" };
export const dynamic = "force-dynamic";

export default async function LlmLabPage() {
  const configured = await configuredProviders();
  const providers = Object.values(PROVIDERS).map((p) => ({
    id: p.id,
    label: p.label,
    model: p.model,
    keyUrl: p.keyUrl,
    envKey: p.envKey,
    configured: configured.includes(p.id),
  }));
  const history = await getRecentLlmRuns();
  const consensusHistory = await getRecentConsensusHistory();

  return (
    <>
      <TopBar
        title="Lab de IA — teste de segurança de modelos"
        subtitle="Red team cruzado de modelos de linguagem"
      />
      <main className="tactical-grid flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1600px] space-y-6 p-8">
          <div className="border border-ash-border bg-surface-1 p-4 text-sm text-fog-blue">
            <strong className="text-bone-white">O que é esta tela?</strong> Ela
            NÃO escaneia sites. Ela testa se <strong className="text-bone-white">modelos
            de inteligência artificial</strong> (Gemini, Groq…) resistem a truques
            de manipulação — útil se você criar um chatbot/assistente de IA. Para
            escanear sites, use <strong className="text-bone-white">Novo Scan</strong>.
            Cada modelo é testado à parte: um símbolo ⊘ significa que aquele
            provedor deu erro (ex.: cota esgotada), não que o teste falhou.
          </div>
          <LlmLab providers={providers} initialRun={history[0] ?? null} history={history} />
          <ConsensusHistory entries={consensusHistory} />
        </div>
      </main>
    </>
  );
}
