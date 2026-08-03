import { NextResponse } from "next/server";
import { deleteProviderKey, getStoredProviderKey, listStoredProviderIds, saveProviderKey } from "@/lib/llm/provider-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const providers = await listStoredProviderIds();
    if (new URL(request.url).searchParams.get("verify") !== "1") return NextResponse.json({ providers });
    const health = await Promise.all(providers.map(async (provider) => {
      const key = await getStoredProviderKey(provider);
      if (!key) return { provider, ok: false, message: "A chave não pôde ser aberta. Confira LLM_KEY_ENCRYPTION_SECRET e cadastre-a novamente." };
      return { provider, ...(await verify(provider, key)) };
    }));
    return NextResponse.json({ providers, health });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível carregar." }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = String(body.provider ?? "");
    const apiKey = String(body.apiKey ?? "");
    const check = await verify(provider, apiKey);
    if (!check.ok) return NextResponse.json({ error: check.message }, { status: 400 });
    await saveProviderKey(provider, apiKey);
    return NextResponse.json({ ok: true, message: check.message });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível salvar." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    await deleteProviderKey(new URL(request.url).searchParams.get("provider") ?? "");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível remover." }, { status: 400 });
  }
}

async function verify(provider: string, key: string) {
  if (key.trim().length < 12) return { ok: false, message: "A chave informada parece inválida." };
  const endpoints: Record<string, string> = {
    openai: "https://api.openai.com/v1/models",
    groq: "https://api.groq.com/openai/v1/models",
    openrouter: "https://openrouter.ai/api/v1/auth/key",
    gemini: `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key.trim())}`,
  };
  const url = endpoints[provider];
  if (!url) return { ok: true, message: "Chave guardada com sucesso e criptografada. Este provedor ainda aguarda adaptador para uso no Lab de IA." };
  try {
    const response = await fetch(url, { headers: provider === "gemini" ? {} : { Authorization: `Bearer ${key.trim()}` }, signal: AbortSignal.timeout(10_000) });
    return response.ok
      ? { ok: true, message: "Chave validada e pronta para uso." }
      : { ok: false, message: "Chave recusada pelo provedor. Substitua-a por uma chave ativa com permissões de API." };
  } catch {
    return { ok: false, message: "Não foi possível alcançar o provedor para validar a chave agora." };
  }
}
