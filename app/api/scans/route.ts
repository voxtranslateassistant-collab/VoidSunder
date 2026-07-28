import { NextResponse } from "next/server";
import { listJobs } from "@/lib/jobs";

/** Compatibility endpoint. Direct execution was removed; jobs are handled by /api/scan-jobs. */
export async function GET() {
  try { return NextResponse.json({ jobs: await listJobs() }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar jobs." }, { status: 500 }); }
}

export async function POST() {
  return NextResponse.json({ error: "Execução direta foi removida. Crie um job em /api/scan-jobs." }, { status: 410 });
}
