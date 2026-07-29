"use client";
import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusDot } from "@/components/ui/status-dot";
import type { ScanStatus } from "@/types";
type LiveJob = { id: string; status: ScanStatus; progress: number; current_step: string | null; error_text: string | null };
export function JobLiveStatus({ initialJob }: { initialJob: LiveJob }) {
  const [job, setJob] = useState(initialJob);
  useEffect(() => { if (["completed", "failed", "cancelled"].includes(job.status)) return; const refresh = async () => { const response = await fetch(`/api/scan-jobs/${job.id}`, { cache: "no-store" }); if (response.ok) setJob((await response.json()).job); }; const interval = window.setInterval(refresh, 3000); return () => window.clearInterval(interval); }, [job.id, job.status]);
  return <><div className="flex flex-wrap items-center gap-5 py-5"><StatusDot status={job.status} /><span className="text-xs text-graphite-veil">{job.current_step ?? "Aguardando worker"} · {job.progress}%</span><span className="ml-auto flex items-center gap-1.5 text-xs text-prism-cyan"><Activity className="size-3.5" />Atualização ao vivo</span></div><ProgressBar value={job.progress} className="mb-5" />{job.error_text && <p className="pb-5 text-xs text-prism-red">{job.error_text}</p>}</>;
}
