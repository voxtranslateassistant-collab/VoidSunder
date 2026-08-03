import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await enforceRateLimit("scan_job_create");
    const { id } = await params; const supabase = await createClient(); const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ error: "Faça login para solicitar um reteste." }, { status: 401 });
    const { data: original, error } = await supabase.from("scan_jobs").select("id, org_id, asset_id, scope_id, profile, target_url, configuration").eq("id", id).maybeSingle();
    if (error) throw error; if (!original) return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });
    const { data: job, error: insertError } = await supabase.from("scan_jobs").insert({ org_id: original.org_id, asset_id: original.asset_id, scope_id: original.scope_id, profile: original.profile, target_url: original.target_url, requested_by: auth.user.id, configuration: { ...(original.configuration ?? {}), retest_of: original.id } }).select("id").single();
    if (insertError) throw insertError;
    await supabase.from("audit_events").insert({ org_id: original.org_id, actor_id: auth.user.id, action: "scan_job.retest_requested", entity_type: "scan_job", entity_id: job.id, metadata: { original_job_id: original.id } });
    return NextResponse.json({ job });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível criar o reteste." }, { status: error instanceof RateLimitError ? 429 : 400 }); }
}
