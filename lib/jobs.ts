import { createClient } from "@/lib/supabase/server";

export type JobProfile = "web_recon" | "authenticated_web" | "api_validation" | "llm_lab";
export type JobStatus = "queued" | "claimed" | "running" | "completed" | "failed" | "cancelled";

export const JOB_PROFILE_LABEL: Record<JobProfile, string> = {
  web_recon: "Reconhecimento Web",
  authenticated_web: "Aplicação autenticada",
  api_validation: "Validação de API",
  llm_lab: "Laboratório de IA",
};

function targetHost(target: string) {
  const url = new URL(/^https?:\/\//i.test(target) ? target : `https://${target}`);
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Apenas URLs HTTP(S) são aceitas.");
  return { url: url.toString(), host: url.hostname.toLowerCase() };
}

export async function listJobs() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scan_jobs")
    .select("id, profile, status, target_url, progress, current_step, created_at, started_at, finished_at, error_text, assets(name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getJobDetail(id: string) {
  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from("scan_jobs")
    .select("*, assets(name, target), scan_steps(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!job) return null;
  const scanId = (job.configuration as { legacy_scan_id?: string } | null)?.legacy_scan_id;
  if (!scanId) return { job, findings: [] };
  const { data: findings, error: findingsError } = await supabase
    .from("findings")
    .select("id, title, severity, status, cwe, cvss, engine, endpoint, summary, detected_at")
    .eq("scan_id", scanId)
    .order("detected_at", { ascending: false });
  if (findingsError) throw findingsError;
  return { job, findings: findings ?? [] };
}

export async function getOperationalOverview() {
  const supabase = await createClient();
  const [assets, active, findings, critical, recent] = await Promise.all([
    supabase.from("assets").select("id", { count: "exact", head: true }),
    supabase.from("scan_jobs").select("id", { count: "exact", head: true }).in("status", ["queued", "claimed", "running"]),
    supabase.from("findings").select("id", { count: "exact", head: true }).in("status", ["open", "confirmed"]),
    supabase.from("findings").select("id", { count: "exact", head: true }).eq("severity", "critical").in("status", ["open", "confirmed"]),
    supabase.from("scan_jobs").select("id, target_url, profile, status, progress, current_step, created_at, assets(name)").order("created_at", { ascending: false }).limit(6),
  ]);
  for (const result of [assets, active, findings, critical, recent]) if (result.error) throw result.error;
  return { assets: assets.count ?? 0, active: active.count ?? 0, findings: findings.count ?? 0, critical: critical.count ?? 0, recent: recent.data ?? [] };
}

/** Creates a personal asset/scope when needed, then enqueues an isolated worker job. */
export async function enqueueJob(input: { target: string; profile: JobProfile; kind: "web_app" | "api" | "llm_endpoint"; environment: "production" | "staging" | "development"; authorized: boolean; configuration?: Record<string, unknown> }) {
  if (!input.authorized) throw new Error("Confirme a autorização para operar este ativo.");
  const { url, host } = targetHost(input.target);
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Faça login antes de criar um scan.");

  const { data: membership, error: membershipError } = await supabase
    .from("org_members").select("org_id").eq("user_id", userData.user.id).limit(1).maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) throw new Error("Seu usuário ainda não foi associado à organização pessoal.");

  let { data: asset, error: assetError } = await supabase
    .from("assets").select("id").eq("org_id", membership.org_id).eq("target", url).maybeSingle();
  if (assetError) throw assetError;
  if (!asset) {
    const created = await supabase.from("assets").insert({ org_id: membership.org_id, name: host, target: url, kind: input.kind, environment: input.environment }).select("id").single();
    if (created.error) throw created.error;
    asset = created.data;
  }
  const { data: existingScope, error: scopeError } = await supabase
    .from("scopes").select("id, status").eq("asset_id", asset.id).eq("status", "approved").maybeSingle();
  if (scopeError) throw scopeError;
  let scopeId = existingScope?.id;
  if (!scopeId) {
    const created = await supabase.from("scopes").insert({ asset_id: asset.id, include_globs: [url], status: "approved", approved_at: new Date().toISOString(), approved_by: userData.user.id, authorized_by: userData.user.email ?? "operador", notes: "Escopo pessoal aprovado ao cadastrar o ativo." }).select("id").single();
    if (created.error) throw created.error;
    scopeId = created.data.id;
  }
  const job = await supabase.from("scan_jobs").insert({ org_id: membership.org_id, asset_id: asset.id, scope_id: scopeId, profile: input.profile, target_url: url, requested_by: userData.user.id, configuration: input.configuration ?? {} }).select("id").single();
  if (job.error) throw job.error;
  await supabase.from("audit_events").insert({ org_id: membership.org_id, actor_id: userData.user.id, action: "scan_job.enqueued", entity_type: "scan_job", entity_id: job.data.id, metadata: { profile: input.profile, target: url } });
  return job.data;
}
