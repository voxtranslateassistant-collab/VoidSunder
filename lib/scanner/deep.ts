import type { CheckResult } from "./checks";
import {
  SECRET_PATTERNS,
  SENSITIVE_PATHS,
  redactSecret,
} from "./patterns";

// ------------------------------------------------------------
// Recon profundo (passivo/leve): baixa os JS ligados na página,
// procura segredos, e-mails e endpoints; testa caminhos sensíveis
// por GET; identifica a stack. Só requisições GET, sem ataque.
// ------------------------------------------------------------

const TIMEOUT = 10_000;
const MAX_JS = 12;
const MAX_JS_BYTES = 500_000;

async function get(
  url: string,
  method: "GET" | "HEAD" = "GET",
): Promise<{ status: number; body: string; contentType: string } | null> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      method,
      signal: c.signal,
      redirect: "manual",
      headers: { "User-Agent": "VoidSunder-Scanner/1.0 (+authorized-audit)" },
    });
    const contentType = res.headers.get("content-type") ?? "";
    let body = "";
    if (method === "GET") {
      const buf = await res.text();
      body = buf.slice(0, MAX_JS_BYTES);
    }
    return { status: res.status, body, contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractScriptUrls(html: string, base: URL): string[] {
  const urls = new Set<string>();
  const re = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && urls.size < MAX_JS) {
    try {
      const u = new URL(m[1], base);
      if (u.origin === base.origin) urls.add(u.toString());
    } catch {
      /* ignora src inválido */
    }
  }
  return [...urls];
}

function findSecrets(source: string, where: string): CheckResult[] {
  const out: CheckResult[] = [];
  const seen = new Set<string>();

  for (const pat of SECRET_PATTERNS) {
    pat.regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = pat.regex.exec(source)) && count < 5) {
      const raw = m[0];
      const key = `${pat.id}:${raw}`;
      if (seen.has(key)) continue;
      seen.add(key);
      count += 1;

      // Filtra falso-positivo óbvio de padrão genérico.
      if (pat.generic && /(example|placeholder|your[_-]?|xxx|<|lorem)/i.test(raw))
        continue;

      out.push({
        checkId: `secret-${pat.id}-${seen.size}`,
        engine: "secret_scan",
        title: `${pat.label} exposto em ${where}`,
        severity: pat.severity,
        cwe: pat.cwe,
        owaspCategory: "A07:2021 – Identification and Authentication Failures",
        cvss: pat.severity === "critical" ? 9.1 : pat.severity === "high" ? 7.5 : 5.3,
        summary: `Um provável ${pat.label} foi encontrado no conteúdo servido (${where}). Segredos no front-end ou em arquivos públicos podem ser usados para acesso não autorizado.`,
        remediation:
          "Remova o segredo do código público, rotacione-o imediatamente (ele deve ser considerado comprometido) e mova-o para variáveis de ambiente no servidor.",
        confidence: pat.generic ? 0.6 : 0.9,
        evidenceSnippet: `${where}: ${redactSecret(raw)}`,
      });
    }
  }
  return out;
}

function findEmails(source: string): string[] {
  const re = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) && set.size < 50) {
    const e = m[0].toLowerCase();
    if (/\.(png|jpg|jpeg|gif|svg|webp|css|js)$/i.test(e)) continue;
    if (/@(example|sentry|w3\.org|schema\.org)/i.test(e)) continue;
    set.add(e);
  }
  return [...set];
}

function extractEndpoints(js: string, base: URL): string[] {
  const set = new Set<string>();
  const re = /["'`](\/(?:api|v\d|graphql|rest|internal|admin|auth|user|account)[A-Za-z0-9_\-/.]*)["'`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(js)) && set.size < 40) set.add(m[1]);
  return [...set];
}

function fingerprintTech(html: string, headers: Record<string, string>): string[] {
  const tech = new Set<string>();
  const gen = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i);
  if (gen) tech.add(gen[1]);
  if (/wp-content|wp-includes/i.test(html)) tech.add("WordPress");
  if (/\/_next\/|__NEXT_DATA__/.test(html)) tech.add("Next.js");
  if (/window\.__NUXT__/.test(html)) tech.add("Nuxt.js");
  if (/ng-version|angular/i.test(html)) tech.add("Angular");
  if (/data-reactroot|react(?:\.min)?\.js/i.test(html)) tech.add("React");
  const jq = html.match(/jquery[-.](\d+\.\d+\.\d+)/i);
  if (jq) tech.add(`jQuery ${jq[1]}`);
  const boot = html.match(/bootstrap[-.](\d+\.\d+\.\d+)/i);
  if (boot) tech.add(`Bootstrap ${boot[1]}`);
  if (headers["x-powered-by"]) tech.add(headers["x-powered-by"]);
  if (headers["server"]) tech.add(headers["server"]);
  return [...tech];
}

export interface DeepResult {
  checks: CheckResult[];
  emails: string[];
  endpoints: string[];
  tech: string[];
  jsFetched: number;
  pathsProbed: number;
}

export async function runDeepRecon(
  base: URL,
  html: string,
  headers: Record<string, string>,
): Promise<DeepResult> {
  const checks: CheckResult[] = [];

  // 1. Segredos no HTML principal
  checks.push(...findSecrets(html, "HTML da página"));

  // 2. Baixa e varre os JS
  const scriptUrls = extractScriptUrls(html, base);
  const jsBodies = await Promise.all(scriptUrls.map((u) => get(u)));
  const endpoints = new Set<string>();
  let jsFetched = 0;
  jsBodies.forEach((r, i) => {
    if (!r || r.status >= 400 || !r.body) return;
    jsFetched += 1;
    const name = scriptUrls[i].split("/").pop() || "script.js";
    checks.push(...findSecrets(r.body, `JS ${name}`));
    extractEndpoints(r.body, base).forEach((e) => endpoints.add(e));
  });

  // 3. E-mails (HTML + JS combinados)
  const emails = findEmails(html + " " + jsBodies.map((b) => b?.body ?? "").join(" "));
  if (emails.length > 0) {
    checks.push({
      checkId: "osint-emails",
      engine: "osint",
      title: `${emails.length} e-mail(s) expostos no conteúdo público`,
      severity: emails.length >= 5 ? "low" : "info",
      cwe: "CWE-200",
      owaspCategory: "A01:2021 – Broken Access Control (exposição de dados)",
      cvss: 3.1,
      summary: `Endereços de e-mail encontrados no HTML/JS podem alimentar phishing direcionado e enumeração de usuários.`,
      remediation:
        "Evite expor e-mails diretos no HTML; use formulários de contato e ofusque endereços quando necessário.",
      confidence: 0.9,
      evidenceSnippet: emails.slice(0, 15).join("\n"),
    });
  }

  // 4. Endpoints internos descobertos no JS
  if (endpoints.size > 0) {
    checks.push({
      checkId: "surface-endpoints",
      engine: "surface_map",
      title: `${endpoints.size} endpoint(s) internos revelados no JavaScript`,
      severity: "info",
      cwe: "CWE-200",
      owaspCategory: "Mapeamento de superfície de ataque",
      cvss: null,
      summary:
        "Rotas de API e caminhos internos ficam visíveis no JS do front-end. Não é falha por si só, mas amplia a superfície e orienta um atacante.",
      remediation:
        "Garanta que cada endpoint listado tenha autenticação e autorização adequadas no servidor — a obscuridade não protege.",
      confidence: 1,
      evidenceSnippet: [...endpoints].slice(0, 25).join("\n"),
    });
  }

  // 5. Caminhos sensíveis
  let pathsProbed = 0;
  const probes = await Promise.all(
    SENSITIVE_PATHS.map(async (sp) => {
      pathsProbed += 1;
      const r = await get(`${base.origin}${sp.path}`);
      return { sp, r };
    }),
  );

  for (const { sp, r } of probes) {
    if (!r) continue;
    const exposed =
      r.status === 200 &&
      (!sp.confirm || sp.confirm.test(r.body)) &&
      !/<html[^>]*>[\s\S]*<\/html>/i.test(r.body.slice(0, 200)) || // evita SPA que devolve index em tudo
      (r.status === 200 && sp.confirm?.test(r.body));

    if (sp.severity === "info") {
      // robots/sitemap/security.txt: só reporta presença como info leve
      if (r.status === 200) {
        checks.push({
          checkId: `exposure-${sp.path}`,
          engine: sp.path.includes("security.txt") ? "disclosure_audit" : "surface_map",
          title: sp.label,
          severity: "info",
          cwe: sp.cwe === "N/A" ? null : sp.cwe,
          owaspCategory: "Reconhecimento",
          cvss: null,
          summary: `${sp.path} está acessível e pode conter caminhos úteis ao reconhecimento.`,
          remediation: "Revise o conteúdo publicado nesses arquivos.",
          confidence: 1,
          evidenceSnippet: `${sp.path} → HTTP 200${r.body ? "\n" + r.body.slice(0, 200) : ""}`,
        });
      }
      continue;
    }

    if (r.status === 200 && (!sp.confirm || sp.confirm.test(r.body))) {
      checks.push({
        checkId: `exposure-${sp.path}`,
        engine: "exposure_scan",
        title: sp.label,
        severity: sp.severity,
        cwe: sp.cwe,
        owaspCategory: "A05:2021 – Security Misconfiguration",
        cvss:
          sp.severity === "critical" ? 9.8 : sp.severity === "high" ? 7.5 : 5.3,
        summary: `O caminho ${sp.path} respondeu 200 com conteúdo compatível com exposição real. Isso pode revelar credenciais, código-fonte ou dados sensíveis.`,
        remediation: `Bloqueie o acesso público a ${sp.path} no servidor/proxy e remova o arquivo do diretório servido. Se continha segredos, rotacione-os.`,
        confidence: sp.confirm ? 0.95 : 0.6,
        evidenceSnippet: `${sp.path} → HTTP 200\n${r.body.slice(0, 220)}`,
      });
    }
  }

  const tech = fingerprintTech(html, headers);
  if (tech.length > 0) {
    checks.push({
      checkId: "tech-fingerprint",
      engine: "tech_fingerprint",
      title: `Stack identificada: ${tech.slice(0, 4).join(", ")}${tech.length > 4 ? "…" : ""}`,
      severity: "info",
      cwe: "CWE-200",
      owaspCategory: "Reconhecimento",
      cvss: null,
      summary:
        "Tecnologias e versões identificadas a partir do conteúdo público. Versões específicas permitem buscar vulnerabilidades conhecidas (CVEs).",
      remediation:
        "Mantenha as dependências atualizadas e evite expor números de versão exatos.",
      confidence: 0.85,
      evidenceSnippet: tech.join("\n"),
    });
  }

  return {
    checks,
    emails,
    endpoints: [...endpoints],
    tech,
    jsFetched,
    pathsProbed,
  };
}
