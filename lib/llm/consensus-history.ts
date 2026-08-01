import { createClient } from "@/lib/supabase/server";

export type ConsensusHistoryEntry = {
  id: string;
  createdAt: string;
  target: string | null;
  profile: string | null;
  providers: string[];
  confidence: number | null;
  state: string | null;
  divergenceCount: number;
};

type StoredConsensus = {
  confidence?: unknown;
  state?: unknown;
  divergences?: unknown;
};

/** Recent scan consensus runs, scoped by the database RLS policy to the signed-in organization. */
export async function getRecentConsensusHistory(limit = 12): Promise<ConsensusHistoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_consensus_runs")
    .select("id, job_id, providers, consensus, created_at, scan_jobs(target_url, profile)")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 24));
  if (error) throw error;

  return (data ?? []).map((item) => {
    const job = Array.isArray(item.scan_jobs) ? item.scan_jobs[0] : item.scan_jobs;
    const consensus = (item.consensus ?? {}) as StoredConsensus;
    const rawProviders = Array.isArray(item.providers) ? item.providers : [];
    const rawDivergences = Array.isArray(consensus.divergences) ? consensus.divergences : [];
    return {
      id: item.id,
      createdAt: item.created_at,
      target: job?.target_url ?? null,
      profile: job?.profile ?? null,
      providers: rawProviders.filter((provider): provider is string => typeof provider === "string"),
      confidence: typeof consensus.confidence === "number" ? Math.round(consensus.confidence * 100) : null,
      state: typeof consensus.state === "string" ? consensus.state : null,
      divergenceCount: rawDivergences.length,
    };
  });
}
