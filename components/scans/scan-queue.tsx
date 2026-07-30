"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { StatusDot } from "@/components/ui/status-dot";
import { formatRelativeTime } from "@/lib/utils";
import type { ScanStatus } from "@/types";

type QueueJob = {
  id: string;
  profile: keyof typeof PROFILE_LABEL;
  status: ScanStatus;
  target_url: string;
  progress: number;
  current_step: string | null;
  created_at: string;
  error_text: string | null;
  assets: { name: string } | { name: string }[] | null;
};

const ACTIVE = new Set<ScanStatus>(["queued", "claimed", "running"]);
const PROFILE_LABEL = {
  web_recon: "Reconhecimento Web",
  authenticated_web: "Aplicação autenticada",
  api_validation: "Validação de API",
  llm_lab: "Laboratório de IA",
} as const;

function DotWave() {
  return (
    <span className="flex h-5 w-11 items-end justify-between" aria-label="Aguardando processamento">
      {["-0.45s", "-0.3s", "-0.15s", "0s"].map((delay) => (
        <i key={delay} className="h-2 w-2 rounded-full bg-prism-cyan" style={{ animation: `dot-wave 1s ease-in-out ${delay} infinite` }} />
      ))}
    </span>
  );
}

export function ScanQueue({ initialJobs }: { initialJobs: QueueJob[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const hasActive = jobs.some((job) => ACTIVE.has(job.status));

  useEffect(() => {
    if (!hasActive) return;
    const refresh = async () => {
      const response = await fetch("/api/scan-jobs", { cache: "no-store" });
      if (response.ok) setJobs((await response.json()).jobs);
    };
    void refresh();
    const interval = window.setInterval(refresh, 3000);
    return () => window.clearInterval(interval);
  }, [hasActive]);

  return (
    <>
      <Table>
        <thead><tr><Th>Ativo</Th><Th className="w-48">Perfil</Th><Th className="w-32">Status</Th><Th>Progresso</Th><Th className="w-24 text-right">Quando</Th></tr></thead>
        <tbody>
          {jobs.map((job) => {
            const asset = Array.isArray(job.assets) ? job.assets[0] : job.assets;
            const active = ACTIVE.has(job.status);
            return (
              <Tr key={job.id}>
                <Td><Link href={`/scans/${job.id}`} className="text-sm transition-colors hover:text-prism-cyan">{asset?.name ?? "Ativo"}</Link><p className="mt-0.5 max-w-xl truncate font-mono text-xs text-graphite-veil">{job.target_url}</p></Td>
                <Td className="text-fog-blue">{PROFILE_LABEL[job.profile]}</Td>
                <Td><StatusDot status={job.status} />{job.error_text && <p className="mt-1 max-w-48 text-xs text-prism-red">{job.error_text}</p>}</Td>
                <Td><div className="w-36">{active ? <div className="flex items-center gap-3"><DotWave /><span className="text-xs text-prism-cyan">Em processamento</span></div> : <div className="h-1.5 overflow-hidden bg-surface-3"><div className="h-full bg-prism-cyan transition-all" style={{ width: `${job.progress}%` }} /></div>}<p className="mt-1 text-xs text-graphite-veil">{job.current_step ?? `${job.progress}%`}</p></div></Td>
                <Td className="text-right text-xs text-graphite-veil">{formatRelativeTime(job.created_at)}</Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      {hasActive && <p className="flex items-center gap-2 px-4 py-3 text-xs text-fog-blue"><Loader2 className="size-3 animate-spin text-prism-cyan" />Fila atualizada automaticamente a cada 3 segundos.</p>}
      <style jsx>{`@keyframes dot-wave { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-170%) } }`}</style>
    </>
  );
}
