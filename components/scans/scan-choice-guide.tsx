import { Bot, Braces, Check, Globe2, Layers3, Laptop, LockKeyhole, Server, Shield } from "lucide-react";

const choices = [
  { icon: Globe2, label: "Tipo de ativo: Web App", use: "Site, landing page, CRM ou painel web", best: "Para sites normais", tone: "text-prism-cyan", recommended: true },
  { icon: Braces, label: "Tipo de ativo: API", use: "Endpoint REST/GraphQL ou contrato OpenAPI", best: "Quando importar ou configurar rotas de API", tone: "text-prism-lime" },
  { icon: Bot, label: "Tipo de ativo: LLM Endpoint", use: "Chatbot ou API de modelo próprio", best: "Para testar segurança de um assistente/modelo", tone: "text-violet-400" },
  { icon: Shield, label: "Perfil: Reconhecimento Web", use: "Headers, postura HTTP e evidência de resposta", best: "Único perfil de site plenamente operacional agora", tone: "text-prism-cyan", recommended: true },
  { icon: LockKeyhole, label: "Perfil: Aplicação autenticada", use: "Área logada com sessão de teste", best: "Próxima evolução: requer Playwright e configuração de login", tone: "text-prism-lime" },
  { icon: Layers3, label: "Perfil: Validação de API", use: "Teste por rotas e contrato de API", best: "Use ao enviar OpenAPI/coleção; evolução por rota pendente", tone: "text-violet-400" },
  { icon: Bot, label: "Perfil: Laboratório de IA", use: "Segurança de chatbot ou modelo", best: "Use pela aba Lab de IA; não é scan de site", tone: "text-amber-400" },
  { icon: Server, label: "Ambiente: Produção", use: "Site real que você controla ou autorizou", best: "Para o site publicado, com escopo estrito", tone: "text-prism-cyan", recommended: true },
  { icon: Layers3, label: "Ambiente: Staging", use: "Homologação", best: "Melhor opção para validar correções antes da produção", tone: "text-prism-lime", recommended: true },
  { icon: Laptop, label: "Ambiente: Desenvolvimento", use: "Ambiente local ou dev autorizado", best: "Não use para domínios públicos", tone: "text-violet-400" },
];

export function ScanChoiceGuide() {
  return (
    <section className="overflow-hidden border border-ash-border bg-surface-1">
      <div className="border-b border-ash-border px-5 py-4"><h2 className="text-base text-bone-white">Guia de escolha rápida</h2><p className="mt-1 text-xs text-fog-blue">Use esta tabela para selecionar o tipo, perfil e ambiente mais adequados antes de criar o job.</p></div>
      <div className="overflow-x-auto"><table className="min-w-[820px] w-full border-collapse"><thead><tr className="border-b border-ash-border bg-surface-2"><th className="w-[36%] px-5 py-3 text-left text-micro-caps text-graphite-veil">Campo</th><th className="w-[31%] px-5 py-3 text-left text-micro-caps text-graphite-veil">Use quando</th><th className="px-5 py-3 text-left text-micro-caps text-graphite-veil">Melhor escolha hoje</th></tr></thead><tbody>{choices.map(({ icon: Icon, label, use, best, tone, recommended }) => <tr key={label} className="border-b border-ash-border/70 last:border-b-0"><td className="px-5 py-3"><span className="flex items-center gap-3"><span className={`flex size-8 items-center justify-center border border-ash-border bg-surface-2 ${tone}`}><Icon className="size-4" /></span><strong className={tone}>{label}</strong></span></td><td className="px-5 py-3 text-sm text-fog-blue">{use}</td><td className={`px-5 py-3 text-sm ${tone}`}><span className="flex items-center justify-between gap-3">{best}{recommended && <Check className="size-4 shrink-0" />}</span></td></tr>)}</tbody></table></div>
    </section>
  );
}
