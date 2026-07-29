"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar, ShieldAlert, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ASSET_KIND_LABEL } from "@/lib/constants";
import { JOB_PROFILE_LABEL, type JobProfile } from "@/lib/job-types";
import type { AssetKind } from "@/types";

export function NewScanForm() {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<AssetKind>("web_app");
  const [profile, setProfile] = useState<JobProfile>("web_recon");
  const [environment, setEnvironment] = useState("production");
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!target.trim() || !authorized) {
      setError(!target.trim() ? "Informe a URL do ativo." : "Confirme a autorização para operar este ativo.");
      return;
    }
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/scan-jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, profile, kind, environment, authorized }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível criar o job.");
      router.push("/scans"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Erro de rede ao criar o job."); }
    finally { setLoading(false); }
  }

  return <div className="grid gap-6 lg:grid-cols-3">
    <div className="lg:col-span-2"><Card><CardHeader><CardTitle>Criar job de validação</CardTitle></CardHeader><CardContent>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex flex-col gap-1.5"><label htmlFor="scan-target" className="text-micro-caps text-graphite-veil">URL do ativo</label>
          <Input id="scan-target" value={target} onChange={(event) => setTarget(event.target.value)} placeholder="https://seu-dominio.com" autoComplete="off" spellCheck={false} />
          <p className="text-xs text-graphite-veil">O painel somente enfileira. O worker isolado valida o escopo aprovado e salva as evidências privadas.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label="Tipo de ativo" value={kind} onChange={(event) => setKind(event.target.value as AssetKind)}>{(Object.keys(ASSET_KIND_LABEL) as AssetKind[]).map((value) => <option key={value} value={value}>{ASSET_KIND_LABEL[value]}</option>)}</Select>
          <Select label="Perfil" value={profile} onChange={(event) => setProfile(event.target.value as JobProfile)}>{(Object.keys(JOB_PROFILE_LABEL) as JobProfile[]).map((value) => <option key={value} value={value}>{JOB_PROFILE_LABEL[value]}</option>)}</Select>
          <Select label="Ambiente" value={environment} onChange={(event) => setEnvironment(event.target.value)}><option value="production">Produção</option><option value="staging">Staging</option><option value="development">Desenvolvimento</option></Select>
        </div>
        <label className="flex cursor-pointer items-start gap-3 border border-ash-border bg-surface-2 p-4"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} className="mt-0.5 size-4 accent-prism-cyan" /><span className="text-xs leading-relaxed text-fog-blue">Declaro que possuo autorização explícita para este ativo. O escopo será registrado e associado a este job.</span></label>
        {error && <div className="flex items-start gap-2 border border-prism-red/40 bg-prism-red/10 p-3 text-xs text-prism-red"><ShieldAlert className="mt-0.5 size-4 shrink-0" /><span>{error}</span></div>}
        <Button type="submit" variant="primary" disabled={loading} title="Cria um job que será executado pelo worker isolado">{loading ? <><Loader2 className="size-4 animate-spin" />Enfileirando…</> : <><Radar className="size-4" />Criar job de scan</>}</Button>
      </form>
    </CardContent></Card></div>
    <div><Card><CardHeader><CardTitle>Perfis disponíveis</CardTitle></CardHeader><CardContent><ul className="space-y-2.5 text-sm text-fog-blue">{["Web/Recon: postura HTTP, tecnologia e superfície pública", "Aplicação autenticada: adaptador Playwright", "API: endpoints informados por OpenAPI/configuração", "Lab de IA: sondagens e histórico por modelo", "Evidência privada, redigida e vinculada ao job"].map((item) => <li key={item} className="flex items-start gap-2"><span className="mt-1.5 size-1 shrink-0 bg-prism-cyan" />{item}</li>)}</ul></CardContent></Card></div>
  </div>;
}
