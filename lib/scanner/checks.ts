import type { EngineId, Severity } from "@/types";

/** Resultado bruto de uma verificação, antes de virar um Finding persistido. */
export interface CheckResult {
  checkId: string;
  engine: EngineId;
  title: string;
  severity: Severity;
  cwe: string | null;
  owaspCategory: string | null;
  cvss: number | null;
  summary: string;
  remediation: string;
  confidence: number;
  evidenceSnippet: string | null;
}

export interface ProbeContext {
  url: URL;
  isHttps: boolean;
  status: number;
  headers: Headers;
  setCookies: string[];
  body: string; // truncado
  hasSecurityTxt: boolean;
}

const header = (h: Headers, name: string) => h.get(name);
const present = (h: Headers, name: string) => h.get(name) !== null;

/**
 * Cada função recebe o contexto real do alvo e retorna 0+ achados.
 * Nada aqui é fictício: tudo deriva da resposta HTTP capturada.
 */
type Check = (ctx: ProbeContext) => CheckResult[];

// --- Transporte / TLS --------------------------------------
const checkTransport: Check = (ctx) => {
  const out: CheckResult[] = [];

  if (!ctx.isHttps) {
    out.push({
      checkId: "no-https",
      engine: "tls_audit",
      title: "Alvo servido sobre HTTP sem criptografia",
      severity: "high",
      cwe: "CWE-319",
      owaspCategory: "A02:2021 – Cryptographic Failures",
      cvss: 7.4,
      summary:
        "O endereço respondeu em HTTP puro. Todo o tráfego — incluindo credenciais e tokens — trafega em texto claro, sujeito a interceptação e manipulação.",
      remediation:
        "Force HTTPS em todo o domínio, redirecione 301 de HTTP para HTTPS e habilite HSTS após validar o certificado.",
      confidence: 1,
      evidenceSnippet: `${ctx.url.origin} respondeu via http://`,
    });
    return out; // HSTS não se aplica sem TLS
  }

  if (!present(ctx.headers, "strict-transport-security")) {
    out.push({
      checkId: "missing-hsts",
      engine: "tls_audit",
      title: "Cabeçalho HSTS (Strict-Transport-Security) ausente",
      severity: "medium",
      cwe: "CWE-319",
      owaspCategory: "A05:2021 – Security Misconfiguration",
      cvss: 5.3,
      summary:
        "Sem HSTS, o navegador pode ser induzido a acessar o site via HTTP na primeira conexão, abrindo janela para ataques de downgrade e SSL stripping.",
      remediation:
        "Envie Strict-Transport-Security: max-age=31536000; includeSubDomains; preload após confirmar que todo o domínio funciona em HTTPS.",
      confidence: 1,
      evidenceSnippet: "Resposta não contém o header Strict-Transport-Security",
    });
  }

  return out;
};

// --- Headers de segurança ----------------------------------
const checkSecurityHeaders: Check = (ctx) => {
  const out: CheckResult[] = [];
  const h = ctx.headers;

  if (!present(h, "content-security-policy")) {
    out.push({
      checkId: "missing-csp",
      engine: "header_audit",
      title: "Content-Security-Policy ausente",
      severity: "medium",
      cwe: "CWE-1021",
      owaspCategory: "A05:2021 – Security Misconfiguration",
      cvss: 6.1,
      summary:
        "A ausência de CSP remove uma camada importante de defesa contra XSS e injeção de recursos externos não autorizados.",
      remediation:
        "Defina uma Content-Security-Policy restritiva, começando por default-src 'self' e liberando origens específicas conforme necessário.",
      confidence: 1,
      evidenceSnippet: "Resposta não contém o header Content-Security-Policy",
    });
  }

  const xfo = header(h, "x-frame-options");
  const csp = header(h, "content-security-policy") ?? "";
  const hasFrameAncestors = /frame-ancestors/i.test(csp);
  if (!xfo && !hasFrameAncestors) {
    out.push({
      checkId: "missing-clickjacking",
      engine: "header_audit",
      title: "Proteção contra clickjacking ausente",
      severity: "medium",
      cwe: "CWE-1021",
      owaspCategory: "A05:2021 – Security Misconfiguration",
      cvss: 4.3,
      summary:
        "Nem X-Frame-Options nem frame-ancestors estão definidos. A página pode ser embutida em um iframe malicioso e usada em ataques de clickjacking.",
      remediation:
        "Defina X-Frame-Options: DENY (ou SAMEORIGIN) e/ou frame-ancestors 'none' na CSP.",
      confidence: 1,
      evidenceSnippet: "Sem X-Frame-Options e sem frame-ancestors na CSP",
    });
  }

  if (
    (header(h, "x-content-type-options") ?? "").toLowerCase() !== "nosniff"
  ) {
    out.push({
      checkId: "missing-nosniff",
      engine: "header_audit",
      title: "X-Content-Type-Options: nosniff ausente",
      severity: "low",
      cwe: "CWE-16",
      owaspCategory: "A05:2021 – Security Misconfiguration",
      cvss: 3.1,
      summary:
        "Sem nosniff, o navegador pode interpretar respostas com um tipo MIME diferente do declarado, facilitando ataques baseados em confusão de tipo.",
      remediation: "Envie X-Content-Type-Options: nosniff em todas as respostas.",
      confidence: 1,
      evidenceSnippet: "Header X-Content-Type-Options ausente ou diferente de nosniff",
    });
  }

  if (!present(h, "referrer-policy")) {
    out.push({
      checkId: "missing-referrer-policy",
      engine: "header_audit",
      title: "Referrer-Policy ausente",
      severity: "low",
      cwe: "CWE-200",
      owaspCategory: "A05:2021 – Security Misconfiguration",
      cvss: 2.6,
      summary:
        "Sem Referrer-Policy, URLs completas (possivelmente com tokens) podem vazar para sites de terceiros via cabeçalho Referer.",
      remediation:
        "Defina Referrer-Policy: strict-origin-when-cross-origin ou mais restritivo.",
      confidence: 1,
      evidenceSnippet: "Resposta não contém o header Referrer-Policy",
    });
  }

  if (!present(h, "permissions-policy")) {
    out.push({
      checkId: "missing-permissions-policy",
      engine: "header_audit",
      title: "Permissions-Policy ausente",
      severity: "info",
      cwe: "CWE-16",
      owaspCategory: "A05:2021 – Security Misconfiguration",
      cvss: null,
      summary:
        "Sem Permissions-Policy, o site não restringe explicitamente APIs sensíveis do navegador (câmera, microfone, geolocalização) para si e seus iframes.",
      remediation:
        "Defina uma Permissions-Policy desabilitando recursos não utilizados, ex.: geolocation=(), camera=(), microphone=().",
      confidence: 1,
      evidenceSnippet: "Resposta não contém o header Permissions-Policy",
    });
  }

  return out;
};

// --- Cookies -----------------------------------------------
const checkCookies: Check = (ctx) => {
  const out: CheckResult[] = [];

  ctx.setCookies.forEach((raw, i) => {
    const name = raw.split("=")[0]?.trim() || `cookie_${i}`;
    const lower = raw.toLowerCase();
    const flags: string[] = [];

    if (ctx.isHttps && !lower.includes("secure")) flags.push("Secure");
    if (!lower.includes("httponly")) flags.push("HttpOnly");
    if (!lower.includes("samesite")) flags.push("SameSite");

    if (flags.length === 0) return;

    const hasSecureOrHttpOnly = flags.some((f) => f !== "SameSite");
    out.push({
      checkId: `cookie-flags-${name}`,
      engine: "cookie_audit",
      title: `Cookie "${name}" sem flags de segurança (${flags.join(", ")})`,
      severity: hasSecureOrHttpOnly ? "medium" : "low",
      cwe: lower.includes("httponly") ? "CWE-1275" : "CWE-1004",
      owaspCategory: "A05:2021 – Security Misconfiguration",
      cvss: hasSecureOrHttpOnly ? 5.4 : 3.5,
      summary: `O cookie "${name}" foi emitido sem: ${flags.join(
        ", ",
      )}. Isso amplia a superfície para roubo de sessão (XSS), interceptação em HTTP e CSRF.`,
      remediation: `Reemita o cookie "${name}" com os atributos ${flags.join(
        ", ",
      )} apropriados. Para cookies de sessão use no mínimo Secure; HttpOnly; SameSite=Lax.`,
      confidence: 1,
      evidenceSnippet: raw.length > 200 ? raw.slice(0, 200) + "…" : raw,
    });
  });

  return out;
};

// --- CORS --------------------------------------------------
const checkCors: Check = (ctx) => {
  const acao = header(ctx.headers, "access-control-allow-origin");
  const acc = header(ctx.headers, "access-control-allow-credentials");
  if (acao === "*") {
    const withCreds = (acc ?? "").toLowerCase() === "true";
    return [
      {
        checkId: "cors-wildcard",
        engine: "cors_audit",
        title: withCreds
          ? "CORS permissivo com credenciais habilitadas"
          : "CORS permite qualquer origem (*)",
        severity: withCreds ? "high" : "medium",
        cwe: "CWE-942",
        owaspCategory: "A05:2021 – Security Misconfiguration",
        cvss: withCreds ? 7.5 : 5.0,
        summary: withCreds
          ? "Access-Control-Allow-Origin: * combinado com Allow-Credentials: true é uma configuração perigosa que pode expor dados autenticados a qualquer site."
          : "Access-Control-Allow-Origin: * permite que qualquer origem faça requisições cross-origin à resposta.",
        remediation:
          "Restrinja Access-Control-Allow-Origin a uma allowlist de origens confiáveis. Nunca combine * com Allow-Credentials.",
        confidence: 1,
        evidenceSnippet: `Access-Control-Allow-Origin: ${acao}${
          acc ? ` · Access-Control-Allow-Credentials: ${acc}` : ""
        }`,
      },
    ];
  }
  return [];
};

// --- Exposição de informação -------------------------------
const checkDisclosure: Check = (ctx) => {
  const out: CheckResult[] = [];
  const h = ctx.headers;

  const server = header(h, "server");
  if (server && /\d/.test(server)) {
    out.push({
      checkId: "server-version",
      engine: "disclosure_audit",
      title: "Cabeçalho Server expõe versão do software",
      severity: "low",
      cwe: "CWE-200",
      owaspCategory: "A05:2021 – Security Misconfiguration",
      cvss: 3.1,
      summary: `O header Server revela "${server}", facilitando o reconhecimento de versões com vulnerabilidades conhecidas.`,
      remediation:
        "Remova ou generalize o header Server no servidor web / proxy reverso.",
      confidence: 0.9,
      evidenceSnippet: `Server: ${server}`,
    });
  }

  const xpb = header(h, "x-powered-by");
  if (xpb) {
    out.push({
      checkId: "x-powered-by",
      engine: "disclosure_audit",
      title: "Cabeçalho X-Powered-By expõe a stack",
      severity: "low",
      cwe: "CWE-200",
      owaspCategory: "A05:2021 – Security Misconfiguration",
      cvss: 3.1,
      summary: `O header X-Powered-By revela "${xpb}", entregando informação de tecnologia desnecessária a um atacante.`,
      remediation:
        "Desative a emissão do header X-Powered-By na aplicação/framework.",
      confidence: 1,
      evidenceSnippet: `X-Powered-By: ${xpb}`,
    });
  }

  if (ctx.isHttps && !ctx.hasSecurityTxt) {
    out.push({
      checkId: "no-security-txt",
      engine: "disclosure_audit",
      title: "Arquivo /.well-known/security.txt ausente",
      severity: "info",
      cwe: null,
      owaspCategory: "Boas práticas (RFC 9116)",
      cvss: null,
      summary:
        "O alvo não publica um security.txt, dificultando que pesquisadores reportem vulnerabilidades por um canal oficial.",
      remediation:
        "Publique /.well-known/security.txt com um contato de segurança, conforme a RFC 9116.",
      confidence: 1,
      evidenceSnippet: "/.well-known/security.txt retornou 404 ou inacessível",
    });
  }

  return out;
};

// --- Conteúdo da página ------------------------------------
const checkContent: Check = (ctx) => {
  if (!ctx.isHttps || !ctx.body) return [];
  const mixed = ctx.body.match(
    /(?:src|href)\s*=\s*["']http:\/\/[^"']+["']/gi,
  );
  if (mixed && mixed.length > 0) {
    return [
      {
        checkId: "mixed-content",
        engine: "content_audit",
        title: "Conteúdo misto: recursos HTTP em página HTTPS",
        severity: "medium",
        cwe: "CWE-311",
        owaspCategory: "A02:2021 – Cryptographic Failures",
        cvss: 4.8,
        summary: `A página HTTPS referencia ${mixed.length} recurso(s) via http://. Navegadores podem bloquear ou expor esse tráfego à interceptação.`,
        remediation:
          "Atualize todas as URLs de recursos para https:// (ou use caminhos relativos ao protocolo).",
        confidence: 0.85,
        evidenceSnippet: mixed.slice(0, 3).join("\n"),
      },
    ];
  }
  return [];
};

export const ALL_CHECKS: Check[] = [
  checkTransport,
  checkSecurityHeaders,
  checkCookies,
  checkCors,
  checkDisclosure,
  checkContent,
];
