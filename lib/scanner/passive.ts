import { ALL_CHECKS, type CheckResult, type ProbeContext } from "./checks";
import { runDeepRecon, type DeepResult } from "./deep";

export interface ScanOutcome {
  ok: boolean;
  error?: string;
  status?: number;
  finalUrl?: string;
  headersDump?: string;
  results: CheckResult[];
  deep?: DeepResult;
  durationMs: number;
}

const TIMEOUT_MS = 12_000;
const MAX_BODY = 250_000;

function normalizeUrl(input: string): URL {
  const trimmed = input.trim();
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return new URL(withScheme);
}

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "VoidSunder-Scanner/1.0 (+passive-audit)",
        Accept: "text/html,application/xhtml+xml,*/*",
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

function dumpHeaders(headers: Headers): string {
  const lines: string[] = [];
  headers.forEach((value, key) => lines.push(`${key}: ${value}`));
  return lines.sort().join("\n");
}

/**
 * Executa a análise passiva REAL de uma URL.
 * Faz uma requisição GET, captura a resposta e roda as verificações
 * determinísticas. Não realiza nenhum ataque ativo.
 */
export async function runPassiveScan(
  rawUrl: string,
  deep = true,
): Promise<ScanOutcome> {
  const started = Date.now();
  let url: URL;

  try {
    url = normalizeUrl(rawUrl);
  } catch {
    return {
      ok: false,
      error: "URL inválida. Use algo como https://exemplo.com",
      results: [],
      durationMs: Date.now() - started,
    };
  }

  let res: Response;
  try {
    res = await fetchWithTimeout(url.toString());
  } catch (e) {
    const msg =
      e instanceof Error && e.name === "AbortError"
        ? `Tempo limite (${TIMEOUT_MS / 1000}s) excedido ao conectar em ${url.origin}`
        : `Não foi possível conectar em ${url.origin}: ${
            e instanceof Error ? e.message : "erro de rede"
          }`;
    return {
      ok: false,
      error: msg,
      results: [],
      durationMs: Date.now() - started,
    };
  }

  const finalUrl = new URL(res.url || url.toString());
  const isHttps = finalUrl.protocol === "https:";

  const setCookies =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : res.headers.get("set-cookie")
        ? [res.headers.get("set-cookie") as string]
        : [];

  let body = "";
  try {
    const text = await res.text();
    body = text.slice(0, MAX_BODY);
  } catch {
    body = "";
  }

  // Checagem best-effort do security.txt (não falha o scan se der erro).
  let hasSecurityTxt = false;
  if (isHttps) {
    try {
      const st = await fetchWithTimeout(
        `${finalUrl.origin}/.well-known/security.txt`,
        { method: "GET" },
      );
      hasSecurityTxt = st.ok;
    } catch {
      hasSecurityTxt = false;
    }
  }

  const ctx: ProbeContext = {
    url: finalUrl,
    isHttps,
    status: res.status,
    headers: res.headers,
    setCookies,
    body,
    hasSecurityTxt,
  };

  const results = ALL_CHECKS.flatMap((check) => {
    try {
      return check(ctx);
    } catch {
      return [];
    }
  });

  let deepResult: DeepResult | undefined;
  if (deep) {
    try {
      const headerObj: Record<string, string> = {};
      res.headers.forEach((v, k) => (headerObj[k] = v));
      deepResult = await runDeepRecon(finalUrl, body, headerObj);
      results.push(...deepResult.checks);
    } catch {
      /* recon profundo é best-effort; não derruba o scan */
    }
  }

  return {
    ok: true,
    status: res.status,
    finalUrl: finalUrl.toString(),
    headersDump: dumpHeaders(res.headers),
    results,
    deep: deepResult,
    durationMs: Date.now() - started,
  };
}
