import { NextResponse } from "next/server";
import { getScanById, getFindingsByScan, setScanAiReport } from "@/lib/store";
import { analyzeScan } from "@/lib/ai/analyst";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await enforceRateLimit("scan_analysis");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Limite temporário atingido." }, { status: 429 });
  }
  const { id } = await params;
  const scan = await getScanById(id);
  if (!scan) return NextResponse.json({ error: "Scan não encontrado." }, { status: 404 });

  const findings = await getFindingsByScan(id);
  const result = await analyzeScan(scan, findings);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await setScanAiReport(id, result.text!, result.provider!);
  return NextResponse.json({ report: result.text, provider: result.provider });
}
