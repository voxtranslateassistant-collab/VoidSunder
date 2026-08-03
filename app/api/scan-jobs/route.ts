import { NextResponse } from "next/server";
import { enqueueJob, listJobs, type JobProfile } from "@/lib/jobs";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  try { return NextResponse.json({ jobs: await listJobs() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar a fila." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profile = body.profile as JobProfile;
    if (!body.target || !["web_recon", "authenticated_web", "api_validation", "llm_lab"].includes(profile)) return NextResponse.json({ error: "Dados de execução inválidos." }, { status: 400 });
    await enforceRateLimit("scan_job_create");
    const job = await enqueueJob({ target: body.target, profile, kind: body.kind ?? "web_app", environment: body.environment ?? "production", authorized: body.authorized === true, configuration: body.configuration, testCredential: body.testCredential });
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível enfileirar o scan." }, { status: 400 });
  }
}
