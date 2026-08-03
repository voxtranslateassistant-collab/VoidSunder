import { NextResponse } from "next/server";
import { getOperationalFindingById, setOperationalFindingAiNote } from "@/lib/operational-data";
import { analyzeFinding } from "@/lib/ai/analyst";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await enforceRateLimit("ai_finding_analysis");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Limite temporário atingido." }, { status: 429 });
  }
  const { id } = await params;
  const finding = await getOperationalFindingById(id);
  if (!finding) return NextResponse.json({ error: "Achado não encontrado." }, { status: 404 });

  const result = await analyzeFinding(finding);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await setOperationalFindingAiNote(id, result.text!);
  return NextResponse.json({ note: result.text, provider: result.provider });
}
