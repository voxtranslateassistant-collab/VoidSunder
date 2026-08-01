import { createClient } from "@supabase/supabase-js";
import { createDecipheriv, createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import net from "node:net";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const workerId = process.env.WORKER_ID || `aegisforge-${process.pid}`;
const pollMs = Number(process.env.WORKER_POLL_MS || 5000);
const heartbeatMs = Number(process.env.WORKER_HEARTBEAT_MS || 30_000);
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
let lastHeartbeatAt = 0;
let lastLeaseRecoveryAt = 0;
let loopInProgress = false;

const isPrivateIp = (ip) => {
  if (net.isIPv4(ip)) return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(ip);
  const normalized = ip.toLowerCase();
  return normalized === "::1" || normalized.startsWith("fe80:") || normalized.startsWith("fc") || normalized.startsWith("fd");
};

async function assertPublicTarget(target, asset, scope) {
  const parsed = new URL(target);
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("O worker aceita somente HTTP(S).");
  const allowed = (scope.include_globs || []).some((value) => {
    try { const allowedUrl = new URL(value); return parsed.origin === allowedUrl.origin; } catch { return false; }
  });
  if (!allowed || parsed.origin !== new URL(asset.target).origin) throw new Error("Destino fora do escopo aprovado.");
  const addresses = await lookup(parsed.hostname, { all: true });
  if (!addresses.length) throw new Error("O DNS do destino não retornou endereços públicos.");
  if (addresses.some(({ address }) => isPrivateIp(address))) throw new Error("Destinos internos ou reservados não são permitidos.");
  return addresses.map(({ address }) => address);
}

async function fetchAuthorizedTarget(target) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(target, {
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": "AegisForge-Worker/1.1 (+authorized-validation)" },
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const destination = new URL(location, target);
      const source = new URL(target);
      if (destination.origin !== source.origin) throw new Error(`Redirecionamento bloqueado por sair do escopo aprovado: ${destination.origin}`);
      const redirected = await fetch(destination, {
        redirect: "error",
        signal: controller.signal,
        headers: { "User-Agent": "AegisForge-Worker/1.1 (+authorized-validation)" },
      });
      return { response: redirected, effectiveTarget: destination.toString(), redirect: destination.toString() };
    }
    return { response, effectiveTarget: target, redirect: null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Erro de conexão desconhecido";
    throw new Error(`Não foi possível obter resposta HTTP autorizada: ${reason}`, { cause: error });
  } finally {
    clearTimeout(timer);
  }
}

async function readResponseExcerpt(response, maxBytes = 100_000) {
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return "";
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let size = 0;
  try {
    while (size < maxBytes) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      const remaining = maxBytes - size;
      const chunk = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      chunks.push(Buffer.from(chunk));
      size += chunk.byteLength;
      if (chunk.byteLength < value.byteLength) break;
    }
  } finally {
    if (size >= maxBytes) await reader.cancel().catch(() => undefined);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function collectPublicMetadata(target) {
  const origin = new URL(target).origin;
  const resources = [
    ["/robots.txt", "robots.txt"],
    ["/sitemap.xml", "sitemap.xml"],
    ["/.well-known/security.txt", "security.txt"],
  ];
  const observations = [];
  const discoveredRoutes = new Set();
  for (const [path, label] of resources) {
    const endpoint = new URL(path, origin);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch(endpoint, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": "AegisForge-Worker/1.1 (+authorized-inventory)" },
      });
      if (response.status >= 200 && response.status < 300) {
        observations.push(["public_file", label, `Disponível (HTTP ${response.status})`, "public_metadata"]);
        const excerpt = await readResponseExcerpt(response, 100_000);
        if (path === "/robots.txt") {
          for (const match of excerpt.matchAll(/^\s*(?:allow|disallow)\s*:\s*(\/[^\s#]*)/gim)) {
            const route = match[1].split("?")[0];
            if (/^\/(?!\/)/.test(route)) discoveredRoutes.add(route.slice(0, 240));
            if (discoveredRoutes.size >= 50) break;
          }
        }
        if (path === "/sitemap.xml") {
          for (const match of excerpt.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
            try {
              const route = new URL(match[1]);
              if (route.origin === origin) discoveredRoutes.add(route.pathname.slice(0, 240));
            } catch { /* malformed public sitemap entry */ }
            if (discoveredRoutes.size >= 50) break;
          }
        }
      }
    } catch { /* metadata is optional and must not fail the authorized scan */ } finally {
      clearTimeout(timer);
    }
  }
  for (const route of discoveredRoutes) observations.push(["route", route, "Rota pública declarada em metadado", "public_metadata"]);
  return observations;
}

function credentialKey() {
  const secret = process.env.ASSET_CREDENTIAL_ENCRYPTION_SECRET;
  if (!secret) throw new Error("O worker não possui ASSET_CREDENTIAL_ENCRYPTION_SECRET configurado.");
  return createHash("sha256").update(secret).digest();
}

function decryptFormCredential(encryptedValue) {
  const [iv, authTag, ciphertext] = String(encryptedValue || "").split(".");
  if (!iv || !authTag || !ciphertext) throw new Error("O formato da credencial de teste é inválido.");
  const decipher = createDecipheriv("aes-256-gcm", credentialKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8");
  const credential = JSON.parse(plaintext);
  if (!credential?.loginUrl || !credential?.username || !credential?.password) throw new Error("A credencial de teste está incompleta.");
  return credential;
}

async function runAuthenticatedValidation(job, target) {
  const { data, error } = await db.from("asset_credentials").select("encrypted_value").eq("asset_id", job.asset_id).eq("kind", "form_login").eq("label", "form-login").maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Nenhuma conta de teste foi cadastrada para este ativo.");
  const credential = decryptFormCredential(data.encrypted_value);
  const targetOrigin = new URL(target).origin;
  if (new URL(credential.loginUrl).origin !== targetOrigin) throw new Error("A URL de login sai do domínio aprovado.");
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, args: ["--disable-dev-shm-usage"] });
  try {
    const page = await browser.newPage();
    const expectedLoginPath = new URL(credential.loginUrl).pathname;
    await page.goto(credential.loginUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.locator('input[type="email"], input[name="email"], input[name="username"], input[autocomplete="username"]').first().fill(credential.username, { timeout: 8_000 });
    await page.locator('input[type="password"]').first().fill(credential.password, { timeout: 8_000 });
    const submit = page.locator('button[type="submit"], input[type="submit"]').first();
    await submit.click({ timeout: 8_000 });
    await page.waitForTimeout(1_000);
    if (credential.postLoginPath) await page.goto(new URL(credential.postLoginPath, targetOrigin).toString(), { waitUntil: "domcontentloaded", timeout: 15_000 });
    const finalUrl = new URL(page.url());
    if (finalUrl.origin !== targetOrigin) throw new Error("O fluxo de login redirecionou para fora do escopo aprovado.");
    if (finalUrl.pathname === expectedLoginPath) throw new Error("A conta de teste não foi autenticada: a rota privada retornou à página de login.");
    const title = (await page.title()).replace(/\s+/g, " ").slice(0, 160);
    const privateLinks = await page.locator("a[href]").evaluateAll((links) => links.map((link) => link.getAttribute("href") || "").filter((href) => href.startsWith("/")).slice(0, 25));
    return { finalPath: finalUrl.pathname, title: title || "Sem título", privateLinks: [...new Set(privateLinks)], loginUrl: credential.loginUrl };
  } finally {
    await browser.close();
  }
}

async function saveFailureDiagnostic(job, target, addresses, error) {
  const detail = error instanceof Error ? error.message : "Erro inesperado";
  const content = [
    "Diagnóstico de conectividade VoidSunder",
    `Alvo autorizado: ${target}`,
    `DNS público: ${addresses.join(", ") || "não resolvido"}`,
    `Momento: ${new Date().toISOString()}`,
    `Resultado: ${detail.slice(0, 800)}`,
    "Nenhuma rota alternativa, credencial ou tentativa de evasão foi executada.",
  ].join("\n");
  const path = `${job.org_id}/${job.id}/connection-diagnostic.txt`;
  const upload = await db.storage.from("evidence-vault").upload(path, Buffer.from(content), { contentType: "text/plain", upsert: false });
  if (upload.error) throw upload.error;
  await db.from("evidence_artifacts").insert({
    org_id: job.org_id, job_id: job.id, kind: "connection_diagnostic", label: "Diagnóstico de conectividade", storage_path: path,
    sha256: createHash("sha256").update(content).digest("hex"), size_bytes: Buffer.byteLength(content), redacted_preview: content,
  });
}

function findingFromHeaders(headers, target) {
  const out = [];
  const required = [
    ["strict-transport-security", "HSTS ausente", "high", "CWE-319", "Configure Strict-Transport-Security para forçar transporte seguro."],
    ["content-security-policy", "Content-Security-Policy ausente", "medium", "CWE-693", "Defina uma CSP restritiva e monitore violações."],
    ["x-content-type-options", "X-Content-Type-Options ausente", "low", "CWE-693", "Envie X-Content-Type-Options: nosniff."],
  ];
  for (const [header, title, severity, cwe, remediation] of required) {
    if (!headers.get(header)) out.push({ title, severity, cwe, remediation, endpoint: target, summary: `O cabeçalho ${header} não foi encontrado na resposta.`, confidence: 0.95 });
  }
  return out.map((finding) => ({
    ...finding,
    finding_type: "missing_security_header",
    validation_status: "confirmed",
    evidence_masked: finding.summary,
    source: "http_headers",
    impact: "Reduz uma camada de protecao do navegador; o impacto depende de uma falha complementar.",
    attack_prerequisites: "Exige uma condicao adicional no ativo, como conteudo controlavel ou interceptacao de trafego.",
    recommended_fix: finding.remediation,
    retest_steps: `Solicite ${finding.endpoint} e confirme a presenca do cabecalho recomendado.`,
    scope_compliance: "approved",
  }));
}

function publicInventory(target, response, body, address) {
  const targetUrl = new URL(target);
  const observations = [
    ["dns", "Hostname", targetUrl.hostname, "dns_lookup"],
    ["dns", "Endereço resolvido", address, "dns_lookup"],
    ["transport", "HTTP status", String(response.status), "http_response"],
    ["technology", "Server", response.headers.get("server") || "não divulgado", "http_headers"],
    ["technology", "X-Powered-By", response.headers.get("x-powered-by") || "não divulgado", "http_headers"],
    ["route", targetUrl.pathname || "/", "Endpoint inicial autorizado", "target_url"],
  ];
  const contentType = response.headers.get("content-type") || "";
  if (contentType) observations.push(["technology", "Content-Type", contentType.split(";")[0], "http_headers"]);
  const generator = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']{1,120})/i)?.[1];
  if (generator) observations.push(["technology", "Generator", generator, "html_meta"]);
  const scriptUrls = new Set();
  for (const match of body.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)) {
    try { const script = new URL(match[1], targetUrl); if (script.origin === targetUrl.origin) scriptUrls.add(script.pathname.slice(0, 240)); } catch { /* malformed public markup */ }
    if (scriptUrls.size >= 30) break;
  }
  for (const path of scriptUrls) observations.push(["script", path, "JavaScript público referenciado", "html_script"]);
  const routes = new Set();
  for (const match of body.matchAll(/<(?:a|form)[^>]+(?:href|action)=["']([^"'#?][^"']*)["']/gi)) {
    try { const route = new URL(match[1], targetUrl); if (route.origin === targetUrl.origin && /^\/(?!\/)/.test(route.pathname)) routes.add(route.pathname.slice(0, 240)); } catch { /* malformed public markup */ }
    if (routes.size >= 50) break;
  }
  for (const path of routes) observations.push(["route", path, "Rota pública referenciada", "html_link"]);
  return observations;
}

function openApiInventory(configuration) {
  const source = configuration?.openapi_spec;
  if (typeof source !== "string" || source.length > 500_000) return [];
  try {
    const document = JSON.parse(source);
    if (!document?.paths || typeof document.paths !== "object") return [];
    const observations = [];
    for (const [path, methods] of Object.entries(document.paths)) {
      if (!path.startsWith("/") || typeof methods !== "object") continue;
      for (const method of Object.keys(methods)) {
        if (!["get", "post", "put", "patch", "delete", "head", "options"].includes(method.toLowerCase())) continue;
        observations.push(["api_surface", `${method.toUpperCase()} ${path}`.slice(0, 240), "Declarado no OpenAPI enviado pelo operador", "openapi_import"]);
        if (observations.length >= 200) return observations;
      }
    }
    return observations;
  } catch { return []; }
}

function openApiContractFindings(configuration, target) {
  const source = configuration?.openapi_spec;
  if (typeof source !== "string" || source.length > 500_000) return [];
  try {
    const document = JSON.parse(source);
    if (!document?.paths || typeof document.paths !== "object" || Array.isArray(document.item)) return [];
    const globalSecurity = Array.isArray(document.security) && document.security.length > 0;
    const findings = [];
    const methodsAllowed = ["get", "post", "put", "patch", "delete", "head", "options"];
    for (const [path, definition] of Object.entries(document.paths)) {
      if (!path.startsWith("/") || !definition || typeof definition !== "object") continue;
      for (const [method, operation] of Object.entries(definition)) {
        if (!methodsAllowed.includes(method.toLowerCase()) || !operation || typeof operation !== "object") continue;
        const endpoint = new URL(path, target).toString();
        const isWrite = ["post", "put", "patch", "delete"].includes(method.toLowerCase());
        const hasOperationSecurity = Array.isArray(operation.security) ? operation.security.length > 0 : globalSecurity;
        if (isWrite && !hasOperationSecurity) findings.push({
          title: "Autenticação não declarada para operação mutável", severity: "medium", cwe: "CWE-306", endpoint,
          summary: `${method.toUpperCase()} ${path} não declara requisito de segurança no contrato OpenAPI.`, confidence: 0.72,
          finding_type: "openapi_authentication_review", validation_status: "conditional", evidence_masked: `${method.toUpperCase()} ${path}; security: ausente`, source: "openapi_import",
          impact: "Uma operação de alteração pode ficar exposta se a implementação também não exigir autenticação.", attack_prerequisites: "A implementação do endpoint deve aceitar a operação sem um controle de autenticação equivalente.",
          recommended_fix: "Declare o esquema de segurança no OpenAPI e confirme no gateway e no servidor que a autenticação é exigida.", retest_steps: "Revise o contrato e execute uma chamada de teste autorizada sem credenciais, esperando 401 ou 403.", scope_compliance: "approved",
        });
        const responseCodes = operation.responses && typeof operation.responses === "object" ? Object.keys(operation.responses) : [];
        const hasErrorResponse = responseCodes.some((code) => ["400", "401", "403", "422", "429", "default"].includes(code));
        if (isWrite && !hasErrorResponse) findings.push({
          title: "Resposta de erro não documentada para operação mutável", severity: "low", cwe: "CWE-209", endpoint,
          summary: `${method.toUpperCase()} ${path} não documenta respostas de erro comuns no contrato OpenAPI.`, confidence: 0.68,
          finding_type: "openapi_error_handling_review", validation_status: "conditional", evidence_masked: `${method.toUpperCase()} ${path}; responses: ${responseCodes.join(", ") || "ausentes"}`, source: "openapi_import",
          impact: "Contratos incompletos dificultam o tratamento seguro de falhas e a integração de clientes.", attack_prerequisites: "A implementação precisa retornar erros não padronizados ou revelar detalhes indevidos.",
          recommended_fix: "Documente respostas 400, 401, 403, 422 e 429 relevantes, com mensagens seguras e sem detalhes internos.", retest_steps: "Compare respostas reais de teste autorizado com o contrato e confirme mensagens genéricas.", scope_compliance: "approved",
        });
        if (findings.length >= 40) return findings;
      }
    }
    return findings;
  } catch { return []; }
}

function postmanInventory(configuration) {
  const source = configuration?.openapi_spec;
  if (typeof source !== "string" || source.length > 500_000) return [];
  try {
    const document = JSON.parse(source);
    if (!Array.isArray(document?.item)) return [];
    const observations = [];
    const walk = (items) => { for (const item of items ?? []) {
      if (Array.isArray(item.item)) walk(item.item);
      const request = item.request;
      const rawUrl = typeof request?.url === "string" ? request.url : request?.url?.raw;
      const method = request?.method;
      if (typeof method === "string" && typeof rawUrl === "string") observations.push(["api_surface", `${method.toUpperCase()} ${rawUrl.replace(/^https?:\/\/[^/]+/i, "") || "/"}`.slice(0, 240), "Declarado na coleção Postman enviada pelo operador", "postman_import"]);
      if (observations.length >= 200) return;
    }};
    walk(document.item); return observations;
  } catch { return []; }
}

function declaredSafeGetRoutes(configuration, target) {
  const source = configuration?.openapi_spec;
  if (typeof source !== "string" || source.length > 500_000) return [];
  try {
    const document = JSON.parse(source);
    const targetUrl = new URL(target);
    const routes = new Set();
    const add = (rawPath, method) => {
      if (method?.toLowerCase() !== "get" || typeof rawPath !== "string" || rawPath.includes("{") || rawPath.includes("}")) return;
      const endpoint = new URL(rawPath, targetUrl);
      if (endpoint.origin === targetUrl.origin && !endpoint.search) routes.add(endpoint.toString());
    };
    if (document?.paths && typeof document.paths === "object" && !Array.isArray(document.item)) {
      for (const [path, definition] of Object.entries(document.paths)) {
        if (!definition || typeof definition !== "object") continue;
        for (const method of Object.keys(definition)) add(path, method);
      }
    }
    const walk = (items) => { for (const item of items ?? []) {
      if (Array.isArray(item.item)) walk(item.item);
      const request = item.request;
      const rawUrl = typeof request?.url === "string" ? request.url : request?.url?.raw;
      if (typeof rawUrl === "string") add(rawUrl, request?.method);
    }};
    if (Array.isArray(document?.item)) walk(document.item);
    return [...routes].slice(0, 20);
  } catch { return []; }
}

async function validateDeclaredGetRoutes(configuration, target) {
  const routes = declaredSafeGetRoutes(configuration, target);
  const results = [];
  for (const endpoint of routes) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch(endpoint, { method: "GET", redirect: "manual", signal: controller.signal, headers: { "User-Agent": "AegisForge-Worker/1.1 (+authorized-api-validation)" } });
      results.push({ endpoint, status: response.status, contentType: response.headers.get("content-type") || "não divulgado" });
    } catch (error) {
      results.push({ endpoint, status: null, contentType: error instanceof Error ? error.message.slice(0, 160) : "falha de conexão" });
    } finally {
      clearTimeout(timer);
    }
  }
  return results;
}

async function validateDeclaredApiRoutes(configuration, target) {
  const routes = declaredSafeGetRoutes(configuration, target);
  const probe = async (endpoint, method) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetch(endpoint, { method, redirect: "manual", signal: controller.signal, headers: { "User-Agent": "AegisForge-Worker/1.1 (+authorized-api-validation)" } });
      return { status: response.status, contentType: response.headers.get("content-type") || "não divulgado", allow: response.headers.get("allow") || "", corsOrigin: response.headers.get("access-control-allow-origin") || "", corsCredentials: response.headers.get("access-control-allow-credentials") || "" };
    } catch (error) {
      return { status: null, contentType: error instanceof Error ? error.message.slice(0, 160) : "falha de conexão", allow: "", corsOrigin: "", corsCredentials: "" };
    } finally {
      clearTimeout(timer);
    }
  };
  const results = [];
  for (const endpoint of routes) {
    const [get, head, options] = await Promise.all([probe(endpoint, "GET"), probe(endpoint, "HEAD"), probe(endpoint, "OPTIONS")]);
    results.push({ endpoint, status: get.status, contentType: get.contentType, headStatus: head.status, optionsStatus: options.status, allowedMethods: options.allow, corsOrigin: options.corsOrigin, corsCredentials: options.corsCredentials });
  }
  return results;
}

function apiRouteProbeFindings(results) {
  return results.flatMap((route) => {
    if (route.corsOrigin === "*" && route.corsCredentials.toLowerCase() === "true") return [{
      title: "CORS permissivo com credenciais em rota de API", severity: "high", cwe: "CWE-942", endpoint: route.endpoint,
      summary: "A resposta OPTIONS da rota declara origem curinga e suporte a credenciais.", confidence: 0.95, finding_type: "cors_misconfiguration", validation_status: "confirmed",
      evidence_masked: `OPTIONS ${new URL(route.endpoint).pathname}; Access-Control-Allow-Origin: *; Access-Control-Allow-Credentials: true`, source: "api_route_validation",
      impact: "Pode expor respostas autenticadas a origens não confiáveis quando a configuração for aceita pelo navegador.", attack_prerequisites: "Usuário autenticado acessando uma origem não confiável compatível.",
      recommended_fix: "Restrinja as origens permitidas e não combine curinga com credenciais.", retest_steps: "Envie OPTIONS com origem não autorizada e confirme que ela não recebe permissão.", scope_compliance: "approved",
    }];
    return [];
  });
}

function apiCorsFindings(headers, target) {
  const origin = headers.get("access-control-allow-origin");
  const credentials = headers.get("access-control-allow-credentials");
  if (origin === "*" && credentials?.toLowerCase() === "true") {
    return [{
      title: "CORS permissivo com credenciais", severity: "high", cwe: "CWE-942", remediation: "Restrinja Access-Control-Allow-Origin a origens confiáveis e não combine curinga com credenciais.", endpoint: target,
      summary: "A resposta permite origem curinga e declara suporte a credenciais.", confidence: 0.95, finding_type: "cors_misconfiguration", validation_status: "confirmed",
      evidence_masked: "Access-Control-Allow-Origin: *; Access-Control-Allow-Credentials: true", source: "http_headers",
      impact: "Pode expor respostas autenticadas a origens não confiáveis quando navegadores aceitarem a configuração.", attack_prerequisites: "Usuário autenticado acessando origem não confiável compatível.",
      recommended_fix: "Use uma lista explícita de origens confiáveis, valide Origin no servidor e limite credenciais.", retest_steps: "Solicite o endpoint com uma origem não autorizada e confirme que CORS não concede acesso.", scope_compliance: "approved",
    }];
  }
  if (origin === "*") {
    return [{
      title: "CORS amplo detectado", severity: "medium", cwe: "CWE-942", remediation: "Avalie se respostas públicas exigem Access-Control-Allow-Origin: *; restrinja quando houver dados ou ações sensíveis.", endpoint: target,
      summary: "A resposta declara Access-Control-Allow-Origin: *.", confidence: 0.85, finding_type: "cors_misconfiguration", validation_status: "conditional",
      evidence_masked: "Access-Control-Allow-Origin: *", source: "http_headers",
      impact: "Pode ampliar a superfície de leitura por sites externos se o endpoint retornar dados sensíveis.", attack_prerequisites: "Endpoint com dados não públicos e navegador de uma origem externa.",
      recommended_fix: "Permita somente origens necessárias e separe endpoints públicos de autenticados.", retest_steps: "Classifique os dados retornados e teste uma origem não autorizada.", scope_compliance: "approved",
    }];
  }
  return [];
}

function apiOperationalFindings(headers, target) {
  const rateHeaders = ["ratelimit-limit", "x-ratelimit-limit", "x-rate-limit-limit", "retry-after"];
  if (!rateHeaders.some((name) => headers.has(name))) return [{ title: "Rate limit não evidenciado", severity: "low", cwe: "CWE-770", remediation: "Implemente limitação por identidade/IP e documente limites de consumo da API.", endpoint: target, summary: "A resposta não expôs indicadores de rate limit; isso não confirma ausência de proteção.", confidence: 0.55, finding_type: "rate_limit_review", validation_status: "conditional", evidence_masked: "Nenhum cabeçalho comum de rate limit foi observado.", source: "http_headers", impact: "Sem controles adequados, endpoints podem sofrer consumo excessivo e degradação de serviço.", attack_prerequisites: "Volume repetido de requisições contra um endpoint sem controle efetivo.", recommended_fix: "Defina limites, alertas e resposta 429 para abuso.", retest_steps: "Valide a política de limite com tráfego de teste autorizado e observe resposta 429.", scope_compliance: "approved" }];
  return [];
}

function safeWorkerError(error) {
  if (!(error instanceof Error)) return "Erro inesperado no worker.";
  const cause = error.cause;
  if (cause && typeof cause === "object") {
    const code = "code" in cause && typeof cause.code === "string" ? cause.code : null;
    if (code) return `Falha de conexão ao alvo (${code}). Verifique DNS, TLS, firewall e disponibilidade pública do domínio.`;
  }
  if (error.message === "fetch failed") return "Falha de conexão ao alvo. Verifique DNS, TLS, firewall e disponibilidade pública do domínio.";
  return error.message.slice(0, 500);
}

async function claim() {
  const { data: candidate } = await db.from("scan_jobs").select("id").eq("status", "queued").order("created_at").limit(1).maybeSingle();
  if (!candidate) return null;
  const lease = new Date(Date.now() + 10 * 60_000).toISOString();
  const { data } = await db.from("scan_jobs").update({ status: "claimed", worker_id: workerId, lease_expires_at: lease, current_step: "Reservado pelo worker" }).eq("id", candidate.id).eq("status", "queued").select("*, assets(*), scopes(*)").maybeSingle();
  return data || null;
}

async function heartbeat() {
  if (Date.now() - lastHeartbeatAt < heartbeatMs) return;
  const { data: organizations, error } = await db.from("organizations").select("id");
  if (error) throw error;
  if (!organizations?.length) return;
  const { error: writeError } = await db.from("worker_heartbeats").upsert(
    organizations.map(({ id }) => ({ org_id: id, worker_id: workerId, status: "online", last_seen_at: new Date().toISOString(), metadata: { poll_ms: pollMs } })),
    { onConflict: "org_id" },
  );
  if (writeError) throw writeError;
  lastHeartbeatAt = Date.now();
}

async function recoverExpiredLeases() {
  if (Date.now() - lastLeaseRecoveryAt < 30_000) return;
  const now = new Date().toISOString();
  const { data: recovered, error } = await db.from("scan_jobs")
    .update({ status: "queued", progress: 0, worker_id: null, lease_expires_at: null, current_step: "Recuperado após interrupção do worker", error_text: null })
    .in("status", ["claimed", "running"])
    .lt("lease_expires_at", now)
    .select("id");
  if (error) throw error;
  if (recovered?.length) {
    await db.from("scan_steps").insert(recovered.map(({ id }) => ({
      job_id: id,
      name: "Recuperado após interrupção do worker",
      status: "queued",
      message: "A reserva expirou e o job voltou à fila para uma nova execução.",
    })));
    console.info(`Recuperados ${recovered.length} job(s) com reserva expirada.`);
  }
  lastLeaseRecoveryAt = Date.now();
}

async function progress(job, value, step) {
  await db.from("scan_jobs").update({ status: "running", progress: value, current_step: step }).eq("id", job.id).neq("status", "cancelled");
  await db.from("scan_steps").insert({ job_id: job.id, name: step, status: "completed", started_at: new Date().toISOString(), finished_at: new Date().toISOString() });
}

async function execute(job) {
  let resolvedAddresses = [];
  try {
    await progress(job, 5, "Validando escopo e destino");
    resolvedAddresses = await assertPublicTarget(job.target_url, job.assets, job.scopes);
    const cancelled = await db.from("scan_jobs").select("status").eq("id", job.id).single();
    if (cancelled.data?.status === "cancelled") return;
    await progress(job, 20, "Coletando resposta HTTP");
    const { response, effectiveTarget, redirect } = await fetchAuthorizedTarget(job.target_url);
    const headersText = [...response.headers.entries()].map(([name, value]) => `${name}: ${value}`).sort().join("\n");
    const body = await readResponseExcerpt(response);
    let authenticatedEvidence = null;
    if (job.profile === "authenticated_web") {
      await progress(job, 45, "Validando sessão de teste com Playwright");
      authenticatedEvidence = await runAuthenticatedValidation(job, effectiveTarget);
    }
    await progress(job, 55, "Analisando postura de segurança");
    const apiRouteResults = job.profile === "api_validation" ? await validateDeclaredApiRoutes(job.configuration, effectiveTarget) : [];
    const rawFindings = job.profile === "llm_lab" ? [] : [
      ...findingFromHeaders(response.headers, effectiveTarget),
      ...(job.profile === "api_validation" ? apiCorsFindings(response.headers, effectiveTarget) : []),
      ...(job.profile === "api_validation" ? apiOperationalFindings(response.headers, effectiveTarget) : []),
      ...(job.profile === "api_validation" ? openApiContractFindings(job.configuration, effectiveTarget) : []),
      ...(job.profile === "api_validation" ? apiRouteProbeFindings(apiRouteResults) : []),
      ...apiRouteResults.filter((route) => typeof route.status === "number" && route.status >= 500).map((route) => ({
        title: "Endpoint de API retornou erro de servidor", severity: "medium", cwe: "CWE-209", endpoint: route.endpoint,
        summary: `GET autorizado recebeu HTTP ${route.status}.`, confidence: 0.9, finding_type: "api_server_error", validation_status: "confirmed",
        evidence_masked: `GET ${new URL(route.endpoint).pathname}; HTTP ${route.status}`, source: "api_route_validation",
        impact: "Erros 5xx podem indicar indisponibilidade ou tratamento inadequado de exceções para consumidores da API.", attack_prerequisites: "Uma chamada GET permitida ao endpoint declarado no contrato.",
        recommended_fix: "Revise logs internos, tratamento de exceções e contrato de resposta do endpoint.", retest_steps: "Repita a chamada GET autorizada após a correção e confirme uma resposta esperada sem erro 5xx.", scope_compliance: "approved",
      })),
    ];
    const { data: scan, error: scanError } = await db.from("scans").insert({ org_id: job.org_id, asset_id: job.asset_id, profile: job.profile === "llm_lab" ? "llm_redteam" : "passive_recon", engines: job.profile === "authenticated_web" ? ["playwright", "custom_fuzzer"] : ["custom_fuzzer"], status: "completed", progress: 100, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), requested_by: job.requested_by }).select("id").single();
    if (scanError) throw scanError;
    const routeObservations = apiRouteResults.map((route) => ["api_validation", `GET ${new URL(route.endpoint).pathname}`, route.status === null ? `Falha controlada: ${route.contentType}` : `HTTP ${route.status}; ${route.contentType.split(";")[0]}`, "api_route_validation"]);
    const apiMethodObservations = apiRouteResults.flatMap((route) => [
      ["api_validation", `HEAD ${new URL(route.endpoint).pathname}`, route.headStatus === null ? "Falha controlada" : `HTTP ${route.headStatus}`, "api_route_validation"],
      ["api_validation", `OPTIONS ${new URL(route.endpoint).pathname}`, `HTTP ${route.optionsStatus ?? "falhou"}${route.allowedMethods ? `; Allow: ${route.allowedMethods}` : ""}${route.corsOrigin ? `; CORS: ${route.corsOrigin}` : ""}`, "api_route_validation"],
    ]);
    const publicMetadata = await collectPublicMetadata(effectiveTarget);
    const authenticatedObservations = authenticatedEvidence ? [["authenticated_route", authenticatedEvidence.finalPath, "Rota confirmada após login de teste", "playwright"], ...authenticatedEvidence.privateLinks.map((path) => ["authenticated_route", path, "Rota privada referenciada", "playwright"])] : [];
    const inventory = [...publicInventory(effectiveTarget, response, body, resolvedAddresses.join(", ")), ...publicMetadata, ...authenticatedObservations, ...(redirect ? [["transport", "Redirecionamento validado", redirect, "http_redirect"]] : []), ...(job.profile === "api_validation" ? openApiInventory(job.configuration) : []), ...(job.profile === "api_validation" ? postmanInventory(job.configuration) : []), ...routeObservations, ...apiMethodObservations];
    await db.from("inventory_observations").upsert(inventory.map(([category, name, value_masked, source]) => ({ org_id: job.org_id, asset_id: job.asset_id, scan_id: scan.id, category, name, value_masked, source })), { onConflict: "asset_id,category,name,source" });
    const fingerprint = (finding) => createHash("sha256").update(`${job.asset_id}:${finding.title}:${finding.endpoint}`).digest("hex");
    const savedFindings = [];
    for (const finding of rawFindings) {
      const { data: saved, error } = await db.from("findings").upsert({ org_id: job.org_id, scan_id: scan.id, asset_id: job.asset_id, title: finding.title, severity: finding.severity, cwe: finding.cwe, engine: "custom_fuzzer", endpoint: finding.endpoint, summary: finding.summary, confidence: finding.confidence, fingerprint: fingerprint(finding) }, { onConflict: "scan_id,fingerprint" }).select("id").single();
      if (error) throw error;
      if (saved) {
        await db.from("findings").update({
          finding_type: finding.finding_type,
          validation_status: finding.validation_status,
          evidence_masked: finding.evidence_masked,
          evidence_hash: createHash("sha256").update(`${headersText}:${finding.title}`).digest("hex"),
          source: finding.source,
          impact: finding.impact,
          attack_prerequisites: finding.attack_prerequisites,
          recommended_fix: finding.recommended_fix,
          retest_steps: finding.retest_steps,
          scope_compliance: finding.scope_compliance,
        }).eq("id", saved.id);
      }
      if (saved) savedFindings.push(saved.id);
    }
    await progress(job, 85, "Guardando evidência redigida");
    const content = `HTTP ${response.status}\n${headersText}\n\n${body.replace(/(authorization|cookie|token)\s*[:=]\s*[^\s;]+/gi, "$1: [REDACTED]").slice(0, 20_000)}`;
    const path = `${job.org_id}/${job.id}/http-response.txt`;
    const upload = await db.storage.from("evidence-vault").upload(path, Buffer.from(content), { contentType: "text/plain", upsert: false });
    if (upload.error) throw upload.error;
    await db.from("evidence_artifacts").insert({ org_id: job.org_id, job_id: job.id, kind: "http_response", label: "Resposta HTTP redigida", storage_path: path, sha256: createHash("sha256").update(content).digest("hex"), size_bytes: Buffer.byteLength(content), redacted_preview: content.slice(0, 500) });
    if (authenticatedEvidence) {
      const authContent = ["Validação autenticada controlada", `Login: ${authenticatedEvidence.loginUrl}`, `Rota confirmada: ${authenticatedEvidence.finalPath}`, `Título: ${authenticatedEvidence.title}`, `Rotas privadas referenciadas: ${authenticatedEvidence.privateLinks.length}`, "Nenhuma senha, cookie, token ou conteúdo pessoal foi armazenado."].join("\n");
      const authPath = `${job.org_id}/${job.id}/authenticated-session.txt`;
      const authUpload = await db.storage.from("evidence-vault").upload(authPath, Buffer.from(authContent), { contentType: "text/plain", upsert: false });
      if (authUpload.error) throw authUpload.error;
      await db.from("evidence_artifacts").insert({ org_id: job.org_id, job_id: job.id, kind: "authenticated_session", label: "Sessão de teste validada", storage_path: authPath, sha256: createHash("sha256").update(authContent).digest("hex"), size_bytes: Buffer.byteLength(authContent), redacted_preview: authContent });
    }
    if (savedFindings.length) await db.from("evidence").insert(savedFindings.map((finding_id) => ({ finding_id, kind: "http_transcript", label: "Resposta HTTP redigida", storage_path: path, size_bytes: Buffer.byteLength(content) })));
    await db.from("scan_jobs").update({ status: "completed", progress: 100, current_step: "Concluído", finished_at: new Date().toISOString(), configuration: { ...job.configuration, legacy_scan_id: scan.id } }).eq("id", job.id);
    await db.from("audit_events").insert({ org_id: job.org_id, actor_id: job.requested_by, action: "scan_job.completed", entity_type: "scan_job", entity_id: job.id, metadata: { findings: rawFindings.length } });
  } catch (error) {
    await saveFailureDiagnostic(job, job.target_url, resolvedAddresses, error).catch(() => undefined);
    await db.from("scan_jobs").update({ status: "failed", current_step: "Falhou", error_text: safeWorkerError(error), finished_at: new Date().toISOString() }).eq("id", job.id);
  }
}

async function loop() {
  if (loopInProgress) return;
  loopInProgress = true;
  try {
    await heartbeat().catch((error) => console.error("worker heartbeat failed", error));
    await recoverExpiredLeases().catch((error) => console.error("lease recovery failed", error));
    const job = await claim();
    if (job) await execute(job);
  } finally {
    loopInProgress = false;
  }
}
setInterval(() => loop().catch(console.error), pollMs);
console.info(`AegisForge worker ativo: ${workerId}; intervalo: ${pollMs}ms`);
loop().catch(console.error);
