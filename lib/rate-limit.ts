import { createClient } from "@/lib/supabase/server";

export type RateLimitAction =
  | "scan_job_create"
  | "ai_consensus"
  | "ai_finding_analysis"
  | "scan_analysis"
  | "llm_lab_run";

export class RateLimitError extends Error {}

/** Distributed, database-backed limit. The database derives the authenticated
 * user from the JWT, so callers cannot raise their own limit or impersonate a user. */
export async function enforceRateLimit(action: RateLimitAction) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("consume_rate_limit", { p_action: action });
  if (error) throw new Error("Não foi possível validar o limite operacional. Tente novamente em alguns instantes.");
  if (!data) throw new RateLimitError("Limite temporário atingido para esta ação. Aguarde alguns minutos e tente novamente.");
}
