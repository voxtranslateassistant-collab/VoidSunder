"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const providers = [
  ["gemini", "Google Gemini"], ["groq", "Groq"], ["openrouter", "OpenRouter"],
  ["openai", "OpenAI"], ["anthropic", "Anthropic"], ["together", "Together AI"],
  ["cohere", "Cohere"], ["huggingface", "Hugging Face"], ["fireworks", "Fireworks"],
  ["replicate", "Replicate"], ["aleph_alpha", "Aleph Alpha"], ["scale", "Scale AI"],
];

type ProviderHealth = { ok: boolean; message: string };

export function ProviderKeyManager() {
  const [provider, setProvider] = useState("gemini");
  const [custom, setCustom] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [stored, setStored] = useState<string[]>([]);
  const [health, setHealth] = useState<Record<string, ProviderHealth>>({});
  const [loading, setLoading] = useState(false);

  async function refreshHealth() {
    setLoading(true);
    try {
      const response = await fetch("/api/llm/providers?verify=1", { cache: "no-store" });
      const data = response.ok ? await response.json() : { providers: [], health: [] };
      setStored(data.providers ?? []);
      setHealth(Object.fromEntries((data.health ?? []).map((item: { provider: string; ok: boolean; message: string }) => [item.provider, { ok: item.ok, message: item.message }])));
    } finally { setLoading(false); }
  }

  useEffect(() => { void refreshHealth(); }, []);

  async function save() {
    const id = provider === "custom" ? custom.trim().toLowerCase().replace(/\s+/g, "_") : provider;
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/llm/providers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: id, apiKey }) });
    const data = await response.json();
    setLoading(false);
    setMessage(response.ok ? (data.message ?? "Chave salva com segurança.") : (data.error ?? "Não foi possível salvar."));
    if (response.ok) {
      setApiKey("");
      setStored((current) => [...new Set([...current, id])]);
      setHealth((current) => ({ ...current, [id]: { ok: true, message: data.message ?? "Chave validada e pronta para uso." } }));
    }
  }

  async function remove(id: string) {
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/llm/providers?provider=${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) { setMessage(data.error ?? "Não foi possível remover a chave."); return; }
    setStored((current) => current.filter((item) => item !== id));
    setHealth((current) => { const next = { ...current }; delete next[id]; return next; });
    setMessage("Chave removida. Cadastre uma nova quando estiver pronto.");
  }

  return <div className="flex flex-col gap-4 border border-ash-border bg-surface-1 p-5">
    <div className="flex items-center gap-2 text-sm text-bone-white"><ShieldCheck className="size-4 text-prism-cyan" />Adicionar chave de IA</div>
    <label className="text-micro-caps text-graphite-veil">Provedor</label>
    <select value={provider} onChange={(event) => setProvider(event.target.value)} className="h-9 border border-ash-border bg-surface-2 px-3 text-sm">
      {providers.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      <option value="custom">Outro provedor</option>
    </select>
    {provider === "custom" && <Input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Nome ou identificador do provedor" autoComplete="off" />}
    <Input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Cole a chave API" autoComplete="off" />
    <Button type="button" variant="primary" disabled={loading || !apiKey.trim() || (provider === "custom" && !custom.trim())} onClick={() => void save()}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Validar e salvar chave
    </Button>
    <p className="text-xs text-graphite-veil">A chave nunca volta para a tela. Gemini, Groq, OpenRouter, OpenAI e Anthropic possuem adaptadores para análise; os demais ficam guardados para integração posterior.</p>
    {stored.length > 0 && <div className="space-y-2 border-t border-ash-border pt-4">
      <div className="flex items-center justify-between"><p className="text-xs text-graphite-veil">Chaves cadastradas e diagnóstico de conexão</p><button type="button" onClick={() => void refreshHealth()} disabled={loading} className="inline-flex items-center gap-1 text-xs text-prism-cyan hover:text-bone-white"><RefreshCw className="size-3" />Testar novamente</button></div>
      {stored.map((id) => { const status = health[id]; return <div key={id} className="flex flex-wrap items-center justify-between gap-2 border border-ash-border bg-surface-2 p-3"><div><p className="flex items-center gap-1.5 text-xs text-bone-white">{status?.ok ? <CheckCircle2 className="size-3 text-prism-lime" /> : <CircleAlert className="size-3 text-prism-red" />}{providers.find(([providerId]) => providerId === id)?.[1] ?? id}</p><p className={status?.ok ? "mt-1 text-xs text-prism-lime" : "mt-1 text-xs text-prism-red"}>{status?.message ?? "Verificando…"}</p></div><button type="button" onClick={() => void remove(id)} disabled={loading} className="inline-flex items-center gap-1 border border-prism-red/40 px-2 py-1 text-xs text-prism-red hover:bg-prism-red/10"><Trash2 className="size-3" />Remover</button></div>; })}
    </div>}
    {message && <p className="text-xs text-fog-blue">{message}</p>}
  </div>;
}
