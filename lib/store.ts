import { promises as fs } from "fs";
import path from "path";
import type {
  Asset,
  Scan,
  Finding,
  Evidence,
  Severity,
  DashboardMetrics,
  LlmRun,
} from "@/types";
import { SEVERITY_ORDER, SEVERITY_WEIGHT } from "@/lib/constants";

// ------------------------------------------------------------
// Persistência real em arquivo local (.data/db.json).
// Zero configuração externa. Substituível por Supabase depois.
// ------------------------------------------------------------

interface DB {
  assets: Asset[];
  scans: Scan[];
  findings: Finding[];
  evidence: Evidence[];
  llmRuns: LlmRun[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const EMPTY: DB = { assets: [], scans: [], findings: [], evidence: [], llmRuns: [] };

async function readDB(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<DB>;
    return {
      assets: parsed.assets ?? [],
      scans: parsed.scans ?? [],
      findings: parsed.findings ?? [],
      evidence: parsed.evidence ?? [],
      llmRuns: parsed.llmRuns ?? [],
    };
  } catch {
    return structuredClone(EMPTY);
  }
}

async function writeDB(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

export function emptyCount(): Record<Severity, number> {
  return { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
}

export function riskFromFindings(findings: { severity: Severity }[]): number {
  const raw = findings.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity], 0);
  return Math.min(100, raw);
}

// --- Leituras ----------------------------------------------
export async function getAssets(): Promise<Asset[]> {
  const db = await readDB();
  return db.assets.sort((a, b) => b.riskScore - a.riskScore);
}

export async function getScans(): Promise<Scan[]> {
  const db = await readDB();
  return db.scans.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );
}

export async function getFindings(): Promise<Finding[]> {
  const db = await readDB();
  return db.findings;
}

export async function getFindingById(id: string): Promise<Finding | undefined> {
  const db = await readDB();
  return db.findings.find((f) => f.id === id);
}

export async function getEvidenceByFinding(
  findingId: string,
): Promise<Evidence[]> {
  const db = await readDB();
  return db.evidence.filter((e) => e.findingId === findingId);
}

export async function getAllEvidence(): Promise<Evidence[]> {
  const db = await readDB();
  return db.evidence.sort(
    (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime(),
  );
}

export async function getScanById(id: string): Promise<Scan | undefined> {
  const db = await readDB();
  return db.scans.find((s) => s.id === id);
}

export async function getAssetById(id: string): Promise<Asset | undefined> {
  const db = await readDB();
  return db.assets.find((a) => a.id === id);
}

export async function getFindingsByScan(scanId: string): Promise<Finding[]> {
  const db = await readDB();
  return db.findings.filter((f) => f.scanId === scanId);
}

export async function getMetrics(): Promise<DashboardMetrics> {
  const db = await readDB();

  const bySeverity = emptyCount();
  const openStatuses = new Set(["open", "confirmed"]);
  let openFindings = 0;
  for (const f of db.findings) {
    bySeverity[f.severity] += 1;
    if (openStatuses.has(f.status)) openFindings += 1;
  }

  const riskScore = db.assets.length
    ? Math.round(
        db.assets.reduce((s, a) => s + a.riskScore, 0) / db.assets.length,
      )
    : 0;

  // Tendência real: risco por scan concluído, em ordem cronológica.
  const completed = db.scans
    .filter((s) => s.status === "completed")
    .sort(
      (a, b) =>
        new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
    )
    .slice(-7);

  const riskTrend = completed.map((s, i) => {
    const findings = db.findings.filter((f) => f.scanId === s.id);
    return { label: `#${i + 1}`, value: riskFromFindings(findings) };
  });

  return {
    riskScore,
    activeScans: db.scans.filter(
      (s) => s.status === "running" || s.status === "queued",
    ).length,
    openFindings,
    assetsMonitored: db.assets.length,
    totalScans: db.scans.length,
    findingsBySeverity: bySeverity,
    riskTrend,
  };
}

// --- Escrita atômica de um scan completo -------------------
export interface PersistScanInput {
  scan: Scan;
  findings: Finding[];
  evidence: Evidence[];
  asset: Asset;
}

export async function persistScan(input: PersistScanInput): Promise<void> {
  const db = await readDB();

  const existingIdx = db.assets.findIndex((a) => a.id === input.asset.id);
  if (existingIdx >= 0) db.assets[existingIdx] = input.asset;
  else db.assets.push(input.asset);

  db.scans.push(input.scan);
  db.findings.push(...input.findings);
  db.evidence.push(...input.evidence);

  await writeDB(db);
}

export async function updateFindingStatus(
  id: string,
  status: Finding["status"],
): Promise<Finding | undefined> {
  const db = await readDB();
  const f = db.findings.find((x) => x.id === id);
  if (!f) return undefined;
  f.status = status;
  await writeDB(db);
  return f;
}

export async function deleteScan(scanId: string): Promise<void> {
  const db = await readDB();
  const scan = db.scans.find((s) => s.id === scanId);
  if (!scan) return;
  const assetId = scan.assetId;

  db.scans = db.scans.filter((s) => s.id !== scanId);
  db.findings = db.findings.filter((f) => f.scanId !== scanId);
  db.evidence = db.evidence.filter((e) => e.scanId !== scanId);

  // Reavalia o asset: remove se não sobrou scan, senão recalcula o risco.
  const remainingScans = db.scans.filter((s) => s.assetId === assetId);
  if (remainingScans.length === 0) {
    db.assets = db.assets.filter((a) => a.id !== assetId);
  } else {
    const asset = db.assets.find((a) => a.id === assetId);
    if (asset) {
      const assetFindings = db.findings.filter((f) => f.assetId === assetId);
      asset.riskScore = riskFromFindings(assetFindings);
      const last = remainingScans
        .map((s) => s.startedAt)
        .sort()
        .at(-1);
      asset.lastScanAt = last ?? null;
    }
  }
  await writeDB(db);
}

export async function setScanAiReport(
  scanId: string,
  report: string,
  provider: string,
): Promise<void> {
  const db = await readDB();
  const scan = db.scans.find((s) => s.id === scanId);
  if (!scan) return;
  scan.aiReport = report;
  scan.aiReportProvider = provider;
  await writeDB(db);
}

export async function setFindingAiNote(
  findingId: string,
  note: string,
): Promise<Finding | undefined> {
  const db = await readDB();
  const f = db.findings.find((x) => x.id === findingId);
  if (!f) return undefined;
  f.aiNote = note;
  await writeDB(db);
  return f;
}

export async function persistLlmRun(run: LlmRun): Promise<void> {
  const db = await readDB();
  db.llmRuns.push(run);
  // Mantém no máximo as 20 execuções mais recentes.
  db.llmRuns = db.llmRuns.slice(-20);
  await writeDB(db);
}

export async function getLatestLlmRun(): Promise<LlmRun | undefined> {
  const db = await readDB();
  return db.llmRuns[db.llmRuns.length - 1];
}

export { SEVERITY_ORDER };
