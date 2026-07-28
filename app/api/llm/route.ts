import { NextResponse } from "next/server";
import { runRedTeam } from "@/lib/llm/redteam";
import { configuredProviders, PROVIDERS } from "@/lib/llm/providers";
import { getLatestLlmRun } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const configured = configuredProviders();
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
  const result = await runRedTeam();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ run: result.run });
}
