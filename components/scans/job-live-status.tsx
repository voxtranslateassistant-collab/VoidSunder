"use client";
import { useEffect, useState } from "react";
import { Activity, BrainCircuit, Loader2 } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusDot } from "@/components/ui/status-dot";
import { Button } from "@/components/ui/button";
import type { ScanStatus } from "@/types";
type LiveJob = { id: string; status: ScanStatus; progress: number; current_step: string | null; error_text: string | null };
export function JobLiveStatus({ initialJob }: { initialJob: LiveJob }) {
 const [job,setJob]=useState(initialJob); const [running,setRunning]=useState(false); const [consensus,setConsensus]=useState<string|null>(null);
 useEffect(()=>{ if(["completed","failed","cancelled"].includes(job.status)) return; const refresh=async()=>{const r=await fetch(`/api/scan-jobs/${job.id}`,{cache:"no-store"});if(r.ok)setJob((await r.json()).job);};const i=window.setInterval(refresh,3000);return()=>window.clearInterval(i);},[job.id,job.status]);
 async function run(){setRunning(true);const r=await fetch(`/api/scan-jobs/${job.id}/consensus`,{method:"POST"});const d=await r.json();setRunning(false);setConsensus(r.ok?`Consenso ${Math.round(d.consensus.confidence*100)}% · ${d.consensus.state}`:(d.error??"Falha ao gerar consenso."));}
 return <><div className="flex flex-wrap items-center gap-5 py-5"><StatusDot status={job.status}/><span className="text-xs text-graphite-veil">{job.current_step??"Aguardando worker"} · {job.progress}%</span><span className="ml-auto flex items-center gap-1.5 text-xs text-prism-cyan"><Activity className="size-3.5"/>Atualização ao vivo</span></div><ProgressBar value={job.progress} className="mb-5"/>{job.status==="completed"&&<div className="mb-5"><Button type="button" variant="secondary" disabled={running} onClick={run}>{running?<Loader2 className="size-4 animate-spin"/>:<BrainCircuit className="size-4"/>}Análise por consenso</Button>{consensus&&<p className="mt-2 text-xs text-fog-blue">{consensus}</p>}</div>}{job.error_text&&<p className="pb-5 text-xs text-prism-red">{job.error_text}</p>}</>;
}
