import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { lookup } from "node:dns/promises";
import net from "node:net";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const workerId = process.env.WORKER_ID || `aegisforge-${process.pid}`;
const pollMs = Number(process.env.WORKER_POLL_MS || 5000);
if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

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
  const address = await lookup(parsed.hostname, { all: false });
  if (isPrivateIp(address.address)) throw new Error("Destinos internos ou reservados não são permitidos.");
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
  return out;
}

async function claim() {
  const { data: candidate } = await db.from("scan_jobs").select("id").eq("status", "queued").order("created_at").limit(1).maybeSingle();
  if (!candidate) return null;
  const lease = new Date(Date.now() + 10 * 60_000).toISOString();
  const { data } = await db.from("scan_jobs").update({ status: "claimed", worker_id: workerId, lease_expires_at: lease, current_step: "Reservado pelo worker" }).eq("id", candidate.id).eq("status", "queued").select("*, assets(*), scopes(*)").maybeSingle();
  return data || null;
}

async function progress(job, value, step) {
  await db.from("scan_jobs").update({ status: "running", progress: value, current_step: step }).eq("id", job.id).neq("status", "cancelled");
  await db.from("scan_steps").insert({ job_id: job.id, name: step, status: "completed", started_at: new Date().toISOString(), finished_at: new Date().toISOString() });
}

async function execute(job) {
  try {
    await progress(job, 5, "Validando escopo e destino");
    await assertPublicTarget(job.target_url, job.assets, job.scopes);
    const cancelled = await db.from("scan_jobs").select("status").eq("id", job.id).single();
    if (cancelled.data?.status === "cancelled") return;
    await progress(job, 20, "Coletando resposta HTTP");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const response = await fetch(job.target_url, { redirect: "error", signal: controller.signal, headers: { "User-Agent": "AegisForge-Worker/1.0 (+authorized-validation)" } });
    clearTimeout(timer);
    const headersText = [...response.headers.entries()].map(([name, value]) => `${name}: ${value}`).sort().join("\n");
    const body = (await response.text()).slice(0, 100_000);
    await progress(job, 55, "Analisando postura de segurança");
    const rawFindings = job.profile === "llm_lab" ? [] : findingFromHeaders(response.headers, job.target_url);
    const { data: scan, error: scanError } = await db.from("scans").insert({ org_id: job.org_id, asset_id: job.asset_id, profile: job.profile === "llm_lab" ? "llm_redteam" : "passive_recon", engines: job.profile === "authenticated_web" ? ["playwright"] : ["custom_fuzzer"], status: "completed", progress: 100, started_at: new Date().toISOString(), finished_at: new Date().toISOString(), requested_by: job.requested_by }).select("id").single();
    if (scanError) throw scanError;
    const fingerprint = (finding) => createHash("sha256").update(`${job.asset_id}:${finding.title}:${finding.endpoint}`).digest("hex");
    for (const finding of rawFindings) {
      const { data: saved, error } = await db.from("findings").upsert({ org_id: job.org_id, scan_id: scan.id, asset_id: job.asset_id, title: finding.title, severity: finding.severity, cwe: finding.cwe, engine: "custom_fuzzer", endpoint: finding.endpoint, summary: finding.summary, confidence: finding.confidence, fingerprint: fingerprint(finding) }, { onConflict: "asset_id,fingerprint" }).select("id").single();
      if (error) throw error;
      if (saved) await db.from("evidence").insert({ finding_id: saved.id, kind: "http_transcript", label: "Resposta HTTP redigida", storage_path: `inline/${job.id}/${saved.id}.txt`, size_bytes: Buffer.byteLength(headersText) });
    }
    await progress(job, 85, "Guardando evidência redigida");
    const content = `HTTP ${response.status}\n${headersText}\n\n${body.replace(/(authorization|cookie|token)\s*[:=]\s*[^\s;]+/gi, "$1: [REDACTED]").slice(0, 20_000)}`;
    const path = `${job.org_id}/${job.id}/http-response.txt`;
    const upload = await db.storage.from("evidence-vault").upload(path, Buffer.from(content), { contentType: "text/plain", upsert: false });
    if (upload.error) throw upload.error;
    await db.from("evidence_artifacts").insert({ org_id: job.org_id, job_id: job.id, kind: "http_response", label: "Resposta HTTP redigida", storage_path: path, sha256: createHash("sha256").update(content).digest("hex"), size_bytes: Buffer.byteLength(content), redacted_preview: content.slice(0, 500) });
    await db.from("scan_jobs").update({ status: "completed", progress: 100, current_step: "Concluído", finished_at: new Date().toISOString(), configuration: { ...job.configuration, legacy_scan_id: scan.id } }).eq("id", job.id);
    await db.from("audit_events").insert({ org_id: job.org_id, actor_id: job.requested_by, action: "scan_job.completed", entity_type: "scan_job", entity_id: job.id, metadata: { findings: rawFindings.length } });
  } catch (error) {
    await db.from("scan_jobs").update({ status: "failed", current_step: "Falhou", error_text: error instanceof Error ? error.message : "Erro inesperado no worker", finished_at: new Date().toISOString() }).eq("id", job.id);
  }
}

async function loop() { const job = await claim(); if (job) await execute(job); }
setInterval(() => loop().catch(console.error), pollMs);
console.info(`AegisForge worker ativo: ${workerId}; intervalo: ${pollMs}ms`);
loop().catch(console.error);
