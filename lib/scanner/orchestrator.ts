import { randomUUID } from "crypto";
import type {
  Asset,
  Scan,
  Finding,
  Evidence,
  AssetKind,
  AssetEnvironment,
} from "@/types";
import {
  emptyCount,
  riskFromFindings,
  persistScan,
  getAssets,
} from "@/lib/store";
import { runPassiveScan } from "./passive";

export interface StartScanInput {
  url: string;
  kind?: AssetKind;
  environment?: AssetEnvironment;
  requestedBy?: string;
}

export interface StartScanResult {
  ok: boolean;
  scanId: string;
  error?: string;
  findingsCount: number;
}

/**
 * Executa um scan real e persiste tudo.
 * Retorna o id do scan para redirecionar o usuário aos resultados.
 */
export async function startScan(
  input: StartScanInput,
): Promise<StartScanResult> {
  const outcome = await runPassiveScan(input.url);

  const finalUrl = outcome.finalUrl ?? input.url;
  let host = input.url;
  try {
    host = new URL(finalUrl).host;
  } catch {
    /* mantém o input */
  }

  const now = new Date().toISOString();
  const scanId = randomUUID();

  // Reaproveita o asset se o host já existir.
  const existing = (await getAssets()).find((a) => a.name === host);
  const assetId = existing?.id ?? randomUUID();

  const findings: Finding[] = [];
  const evidence: Evidence[] = [];
  const counts = emptyCount();

  for (const r of outcome.results) {
    const findingId = randomUUID();
    counts[r.severity] += 1;

    findings.push({
      id: findingId,
      scanId,
      assetId,
      assetName: host,
      title: r.title,
      severity: r.severity,
      status: "open",
      cwe: r.cwe,
      owaspCategory: r.owaspCategory,
      cvss: r.cvss,
      engine: r.engine,
      endpoint: finalUrl,
      summary: r.summary,
      remediation: r.remediation,
      confidence: r.confidence,
      evidenceSnippet: r.evidenceSnippet,
      aiNote: null,
      detectedAt: now,
    });

    if (r.evidenceSnippet) {
      evidence.push({
        id: randomUUID(),
        findingId,
        scanId,
        kind: r.engine === "cookie_audit" ? "cookie" : "config",
        label: r.title,
        content: r.evidenceSnippet,
        sizeBytes: Buffer.byteLength(r.evidenceSnippet, "utf-8"),
        capturedAt: now,
      });
    }
  }

  // Evidência global: dump real dos headers da resposta.
  if (outcome.headersDump) {
    evidence.push({
      id: randomUUID(),
      findingId: "",
      scanId,
      kind: "http_headers",
      label: `Cabeçalhos HTTP de ${host}`,
      content: outcome.headersDump,
      sizeBytes: Buffer.byteLength(outcome.headersDump, "utf-8"),
      capturedAt: now,
    });
  }

  const engines = Array.from(new Set(findings.map((f) => f.engine)));
  const risk = riskFromFindings(findings);

  const scan: Scan = {
    id: scanId,
    assetId,
    assetName: host,
    targetUrl: finalUrl,
    profile: "passive_web",
    engines,
    status: outcome.ok ? "completed" : "failed",
    progress: 100,
    startedAt: now,
    finishedAt: new Date().toISOString(),
    requestedBy: input.requestedBy ?? "operador",
    durationMs: outcome.durationMs,
    errorText: outcome.ok ? null : (outcome.error ?? "Falha desconhecida"),
    findingsCount: counts,
    aiReport: null,
    aiReportProvider: null,
  };

  const asset: Asset = {
    id: assetId,
    name: host,
    kind: input.kind ?? "web_app",
    environment: input.environment ?? "production",
    target: finalUrl,
    owner: existing?.owner ?? "—",
    tags: existing?.tags ?? [],
    riskScore: risk,
    lastScanAt: now,
    createdAt: existing?.createdAt ?? now,
  };

  await persistScan({ scan, findings, evidence, asset });

  return {
    ok: outcome.ok,
    scanId,
    error: outcome.ok ? undefined : outcome.error,
    findingsCount: findings.length,
  };
}
