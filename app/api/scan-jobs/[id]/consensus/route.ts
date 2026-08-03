import { NextResponse } from "next/server";
import { getJobDetail } from "@/lib/jobs";
import { orchestrateConsensus } from "@/lib/llm/consensus";
import type { Finding } from "@/types";
import { enforceRateLimit, RateLimitError } from "@/lib/rate-limit";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { await enforceRateLimit("ai_consensus"); const { id } = await params; const detail = await getJobDetail(id); if (!detail) return NextResponse.json({ error: "Job não encontrado." }, { status: 404 }); const scanId = (detail.job.configuration as { legacy_scan_id?: string } | null)?.legacy_scan_id; const consensus = await orchestrateConsensus({ jobId: id, scanId, findings: detail.findings as unknown as Finding[] }); return NextResponse.json({ consensus }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Falha ao gerar consenso." }, { status: error instanceof RateLimitError ? 429 : 400 }); }
}
