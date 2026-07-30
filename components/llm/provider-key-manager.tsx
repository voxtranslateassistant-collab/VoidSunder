"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const providers = [
  ["gemini", "Google Gemini"], ["groq", "Groq"], ["openrouter", "OpenRouter"],
  ["openai", "OpenAI"], ["anthropic", "Anthropic"], ["together", "Together AI"],
  ["cohere", "Cohere"], ["huggingface", "Hugging Face"], ["fireworks", "Fireworks"],
  ["replicate", "Replicate"], ["aleph_alpha", "Aleph Alpha"], ["scale", "Scale AI"],
];

export function ProviderKeyManager() {
  const [provider, setProvider] = useState("gemini");
  const [custom, setCustom] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [stored, setStored] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/llm/providers", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : { providers: [] })
      .then((data) => setStored(data.providers ?? []))
      .catch(() => setStored([]));
  }, []);

  async function save() {
    const id = provider === "custom" ? custom.trim().toLowerCase().replace(/\s+/g, "_") : provider;
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/llm/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: id, apiKey }),
    });
    const data = await response.json();
    setLoading(false);
    setMessage(response.ok ? (data.message ?? "Chave salva com segurança.") : (data.error ?? "Não foi possível salvar."));
    if (response.ok) {
      setApiKey("");
      setStored((current) => [...new Set([...current, id])]);
    }
  }

  return (
    <div className="flex flex-col gap-4 border border-ash-border bg-surface-1 p-5">
      <div className="flex items-center gap-2 text-sm text-bone-white"><ShieldCheck className="size-4 text-prism-cyan" />Adicionar chave de IA</div>
      <label className="text-micro-caps text-graphite-veil">Provedor</label>
      <select value={provider} onChange={(event) => setProvider(event.target.value)} className="h-9 border border-ash-border bg-surface-2 px-3 text-sm">
        {providers.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        <option value="custom">Outro provedor</option>
      </select>
      {provider === "custom" && <Input value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Nome ou identificador do provedor" autoComplete="off" />}
      <Input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="Cole a chave API" autoComplete="off" />
      <Button type="button" variant="primary" disabled={loading || !apiKey.trim() || (provider === "custom" && !custom.trim())} onClick={save}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        Validar e salvar chave
      </Button>
      <p className="text-xs text-graphite-veil">A chave nunca volta para a tela. Gemini, Groq, OpenRouter, OpenAI e Anthropic possuem adaptadores para análise; os demais ficam guardados para integração posterior.</p>
      {stored.length > 0 && <div className="flex flex-wrap gap-2 border-t border-ash-border pt-4">{stored.map((id) => <span key={id} className="inline-flex items-center gap-1 border border-prism-cyan/40 px-2 py-1 text-xs text-prism-cyan"><CheckCircle2 className="size-3" />{providers.find(([providerId]) => providerId === id)?.[1] ?? id}</span>)}</div>}
      {message && <p className="text-xs text-fog-blue">{message}</p>}
    </div>
  );
}
