"use client";

import { useEffect, useState } from "react";
import { Activity, BrainCircuit, Loader2, RotateCcw } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import type { ScanStatus } from "@/types";

type LiveJob = { id: string; status: ScanStatus; progress: number; current_step: string | null; error_text: string | null };
const TERMINAL = ["completed", "failed", "cancelled"];

function DotWave() {
  return <span className="flex h-5 w-11 items-end justify-between" aria-label="Processando">{["-0.45s", "-0.3s", "-0.15s", "0s"].map((delay) => <i key={delay} className="h-2 w-2 rounded-full bg-prism-cyan" style={{ animation: `dot-wave 1s ease-in-out ${delay} infinite` }} />)}</span>;
}

export function JobLiveStatus({ initialJob }: { initialJob: LiveJob }) {
  const [job, setJob] = useState(initialJob);
  const [running, setRunning] = useState(false);
  const [retesting, setRetesting] = useState(false);
  const [consensus, setConsensus] = useState<string | null>(null);
  const [retestError, setRetestError] = useState<string | null>(null);
  const active = !TERMINAL.includes(job.status);
  const terminalLabel = job.status === "failed" ? "Falhou" : job.status === "cancelled" ? "Cancelado" : "Concluído";
  const connectionFailure = job.error_text?.includes("Falha de conexão ao alvo");

  useEffect(() => {
    if (!active) return;
    const refresh = async () => { const response = await fetch(`/api/scan-jobs/${job.id}`, { cache: "no-store" }); if (response.ok) setJob((await response.json()).job); };
    const interval = window.setInterval(refresh, 3000);
    return () => window.clearInterval(interval);
  }, [job.id, active]);

  async function runConsensus() {
    setRunning(true);
    const response = await fetch(`/api/scan-jobs/${job.id}/consensus`, { method: "POST" });
    const data = await response.json();
    setRunning(false);
    setConsensus(response.ok ? `Consenso ${Math.round(data.consensus.confidence * 100)}% · ${data.consensus.state}` : (data.error ?? "Falha ao gerar consenso."));
  }

  async function requestRetest() {
    setRetesting(true); setRetestError(null);
    const response = await fetch(`/api/scan-jobs/${job.id}/retest`, { method: "POST" });
    const data = await response.json(); setRetesting(false);
    if (response.ok && data.job?.id) { window.location.assign(`/scans/${data.job.id}`); return; }
    setRetestError(data.error ?? "Não foi possível criar o reteste.");
  }

  return <>
    <div className="flex flex-wrap items-center gap-5 py-5"><StatusDot status={job.status} /><span className="text-xs text-graphite-veil">{job.current_step ?? "Aguardando worker"} · {job.progress}%</span><span className="ml-auto flex items-center gap-2 text-xs text-prism-cyan">{active ? <DotWave /> : <Activity className="size-3.5" />}{active ? "Processando em tempo real" : terminalLabel}</span></div>
    {active ? <p className="mb-5 text-xs text-fog-blue">O worker está processando as etapas autorizadas…</p> : <ProgressBar value={job.progress} className="mb-5" />}
    {(job.status === "completed" || job.status === "failed") && <div className="mb-5 flex flex-wrap items-center gap-3">
      {job.status === "completed" && <Button type="button" variant="secondary" disabled={running} onClick={runConsensus}>{running ? <Loader2 className="size-4 animate-spin" /> : <BrainCircuit className="size-4" />}Análise por consenso</Button>}
      <Button type="button" variant="secondary" disabled={retesting} onClick={requestRetest}>{retesting ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}{job.status === "failed" ? "Tentar novamente" : "Solicitar reteste"}</Button>
      {consensus && <p className="basis-full text-xs text-fog-blue">{consensus}</p>}
      {retestError && <p className="basis-full text-xs text-prism-red">{retestError}</p>}
    </div>}
    {job.error_text && <div className="mb-5 border border-prism-red/35 bg-prism-red/5 p-4 text-xs"><p className="text-prism-red">{job.error_text}</p>{connectionFailure && <p className="mt-2 text-fog-blue">Confirme que o domínio aceita conexões HTTPS públicas a partir do Railway, possui certificado TLS válido e não bloqueia o endereço do worker. Depois use “Tentar novamente”.</p>}</div>}
    <style jsx>{`@keyframes dot-wave { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-170%) } }`}</style>
  </>;
}
