import type { LlmProviderId } from "@/types";
import { getStoredProviderKey, listStoredProviderIds } from "./provider-keys";

// ------------------------------------------------------------
// Clients reais dos provedores gratuitos.
// As chaves ficam SEMPRE no servidor (.env.local), nunca no client.
// ------------------------------------------------------------

export interface ProviderConfig {
  id: LlmProviderId;
  label: string;
  model: string;
  envKey: string;
  keyUrl: string;
}

export const PROVIDERS: Record<LlmProviderId, ProviderConfig> = {
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    envKey: "GEMINI_API_KEY",
    keyUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    id: "groq",
    label: "Groq · Llama 3.3 70B",
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    envKey: "GROQ_API_KEY",
    keyUrl: "https://console.groq.com/keys",
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    model:
      process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free",
    envKey: "OPENROUTER_API_KEY",
    keyUrl: "https://openrouter.ai/keys",
  },
  openai: {
    id: "openai",
    label: "OpenAI",
    model: process.env.OPENAI_MODEL || "gpt-4-turbo",
    envKey: "OPENAI_API_KEY",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    label: "Anthropic · Claude",
    model: process.env.ANTHROPIC_MODEL || "claude-3-opus-20240229",
    envKey: "ANTHROPIC_API_KEY",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
};

export async function providerKey(id: LlmProviderId): Promise<string | undefined> {
  return (await getStoredProviderKey(id)) ?? process.env[PROVIDERS[id].envKey];
}

export async function configuredProviders(): Promise<LlmProviderId[]> {
  const stored = await listStoredProviderIds().catch(() => [] as LlmProviderId[]);
  return (Object.keys(PROVIDERS) as LlmProviderId[]).filter((id) => stored.includes(id) || Boolean(process.env[PROVIDERS[id].envKey]));
}

export interface ChatResult {
  ok: boolean;
  text: string;
  error: string | null;
  latencyMs: number;
}

const TIMEOUT_MS = 30_000;

async function withTimeout(
  fn: (signal: AbortSignal) => Promise<Response>,
): Promise<Response> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT_MS);
  try {
    return await fn(c.signal);
  } finally {
    clearTimeout(t);
  }
}

/** Envia (system,user) a um provedor e devolve o texto da resposta. */
export async function chat(
  id: LlmProviderId,
  system: string,
  user: string,
): Promise<ChatResult> {
  const key = await providerKey(id);
  const cfg = PROVIDERS[id];
  const started = Date.now();

  if (!key) {
    return {
      ok: false,
      text: "",
      error: `Chave ${cfg.envKey} não configurada`,
      latencyMs: 0,
    };
  }

  try {
    let res: Response;

    if (id === "gemini") {
      res = await withTimeout((signal) =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${key}`,
          {
            method: "POST",
            signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: "user", parts: [{ text: user }] }],
              generationConfig: { temperature: 0, maxOutputTokens: 512 },
            }),
          },
        ),
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const text =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text ?? "")
          .join("") ?? "";
      return { ok: true, text, error: null, latencyMs: Date.now() - started };
    }

    if (id === "anthropic") {
      res = await withTimeout((signal) => fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal, headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: cfg.model, max_tokens: 512, system, messages: [{ role: "user", content: user }] }) }));
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json();
      return { ok: true, text: data?.content?.map((item: { text?: string }) => item.text ?? "").join("") ?? "", error: null, latencyMs: Date.now() - started };
    }

    // Groq, OpenRouter e OpenAI são compatíveis com Chat Completions.
    const endpoint =
      id === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : id === "openrouter" ? "https://openrouter.ai/api/v1/chat/completions" : "https://api.openai.com/v1/chat/completions";

    res = await withTimeout((signal) =>
      fetch(endpoint, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0,
          max_tokens: 512,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      }),
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return { ok: true, text, error: null, latencyMs: Date.now() - started };
  } catch (e) {
    return {
      ok: false,
      text: "",
      error: e instanceof Error ? e.message.slice(0, 200) : "erro desconhecido",
      latencyMs: Date.now() - started,
    };
  }
}
