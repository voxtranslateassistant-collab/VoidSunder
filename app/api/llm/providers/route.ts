import { NextResponse } from "next/server";
import type { LlmProviderId } from "@/types";
import { deleteProviderKey, listStoredProviderIds, saveProviderKey } from "@/lib/llm/provider-keys";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET() { try { return NextResponse.json({ providers: await listStoredProviderIds() }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os provedores." }, { status: 401 }); } }
export async function POST(request: Request) { try { const body = await request.json(); await saveProviderKey(body.provider as LlmProviderId, String(body.apiKey ?? "")); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a chave." }, { status: 400 }); } }
export async function DELETE(request: Request) { try { await deleteProviderKey(new URL(request.url).searchParams.get("provider") as LlmProviderId); return NextResponse.json({ ok: true }); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível remover a chave." }, { status: 400 }); } }
