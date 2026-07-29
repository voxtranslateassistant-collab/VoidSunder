import { NextResponse } from "next/server";

/** Legacy route intentionally disabled: deletion/execution now operates on scan_jobs. */
export async function DELETE() {
  return NextResponse.json({ error: "Use /api/scan-jobs/:id para operar jobs." }, { status: 410 });
}
