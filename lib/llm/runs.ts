import type { LlmProviderId, LlmProbeResult, LlmRun } from "@/types";
import { createClient } from "@/lib/supabase/server";

async function currentOrgId() {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return null;

  const { data: membership, error: membershipError } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", userData.user.id)
    .limit(1)
    .maybeSingle();
  if (membershipError) throw membershipError;
  return membership?.org_id ?? null;
}

export async function ensureLlmAccess(): Promise<void> {
  const orgId = await currentOrgId();
  if (!orgId) throw new Error("Faça login com um usuário associado à organização para executar o Lab de IA.");
}

export async function persistLlmRun(run: LlmRun): Promise<void> {
  const orgId = await currentOrgId();
  if (!orgId) throw new Error("Seu usuário não está associado a uma organização.");
  const supabase = await createClient();
  const { error } = await supabase.from("llm_runs").insert({ id: run.id, org_id: orgId, providers: run.providers, results: run.results, started_at: run.startedAt });
  if (error) throw error;
}

export async function getLatestLlmRun(): Promise<LlmRun | undefined> {
  const orgId = await currentOrgId();
  if (!orgId) return undefined;
  const supabase = await createClient();
  const { data, error } = await supabase.from("llm_runs").select("id, providers, results, started_at").eq("org_id", orgId).order("started_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return { id: data.id, providers: data.providers as LlmProviderId[], results: data.results as LlmProbeResult[], startedAt: data.started_at };
}
