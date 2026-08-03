import { NextResponse } from "next/server";
import { runRedTeam } from "@/lib/llm/redteam";
import { configuredProviders, PROVIDERS } from "@/lib/llm/providers";
import { ensureLlmAccess, getLatestLlmRun, persistLlmRun } from "@/lib/llm/runs";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = await configuredProviders();
  const latest = await getLatestLlmRun();
  return NextResponse.json({
    providers: Object.values(PROVIDERS).map((p) => ({
      id: p.id,
      label: p.label,
      model: p.model,
      keyUrl: p.keyUrl,
      envKey: p.envKey,
      configured: configured.includes(p.id),
    })),
    latest: latest ?? null,
  });
}

export async function POST() {
  try {
    await ensureLlmAccess();
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Autenticação necessária." }, { status: 401 });
  }
  try {
    await enforceRateLimit("llm_lab_run");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Limite temporário atingido." }, { status: 429 });
  }
  const result = await runRedTeam();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  try {
    await persistLlmRun(result.run!);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a execução do Lab de IA." }, { status: 500 });
  }
  return NextResponse.json({ run: result.run });
}
