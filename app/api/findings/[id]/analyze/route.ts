import { NextResponse } from "next/server";
import { getFindingById, setFindingAiNote } from "@/lib/store";
import { analyzeFinding } from "@/lib/ai/analyst";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const finding = await getFindingById(id);
  if (!finding) return NextResponse.json({ error: "Achado não encontrado." }, { status: 404 });

  const result = await analyzeFinding(finding);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  await setFindingAiNote(id, result.text!);
  return NextResponse.json({ note: result.text, provider: result.provider });
}
