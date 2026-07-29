import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase.from("scan_jobs").update({ status: "cancelled", cancelled_at: new Date().toISOString(), current_step: "Cancelado pelo operador" }).eq("id", id).in("status", ["queued", "claimed"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
