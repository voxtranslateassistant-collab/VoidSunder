import { NextResponse } from "next/server";
import { getOperationalFindingById } from "@/lib/operational-data";
import { orchestrateConsensus } from "@/lib/llm/consensus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const finding = await getOperationalFindingById(id);
    if (!finding) return NextResponse.json({ error: "Achado não encontrado." }, { status: 404 });
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const { data: job, error } = await supabase.from("scan_jobs").select("id").contains("configuration", { legacy_scan_id: finding.scanId }).limit(1).maybeSingle();
    if (error) throw error;
    if (!job) return NextResponse.json({ error: "Não foi possível localizar o job deste achado." }, { status: 404 });
    const consensus = await orchestrateConsensus({ jobId: job.id, scanId: finding.scanId, findings: [finding] });
    return NextResponse.json({ consensus });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao gerar consenso." }, { status: 400 });
  }
}
