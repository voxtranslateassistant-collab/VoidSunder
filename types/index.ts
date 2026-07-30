// ============================================================
// VoidSunder — Domain Types
// ============================================================

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type AssetKind = "web_app" | "api" | "llm_endpoint";

export type AssetEnvironment = "production" | "staging" | "development";

export type ScanStatus = "queued" | "claimed" | "running" | "completed" | "failed" | "cancelled";

export type ScanProfile = "passive_web" | "llm_probe";

export type FindingStatus =
  | "open"
  | "confirmed"
  | "false_positive"
  | "remediated"
  | "accepted_risk";

/** Categorias reais de verificação executadas pelo motor passivo. */
export type EngineId =
  | "header_audit"
  | "cookie_audit"
  | "tls_audit"
  | "cors_audit"
  | "disclosure_audit"
  | "content_audit"
  | "secret_scan"
  | "exposure_scan"
  | "osint"
  | "tech_fingerprint"
  | "surface_map"
  | "llm_probe";

export interface Asset {
  id: string;
  name: string; // hostname
  kind: AssetKind;
  environment: AssetEnvironment;
  target: string; // URL completa
  owner: string;
  tags: string[];
  riskScore: number; // 0-100, derivado dos findings reais
  lastScanAt: string | null;
  createdAt: string;
}

export interface Scan {
  id: string;
  assetId: string;
  assetName: string;
  targetUrl: string;
  profile: ScanProfile;
  engines: EngineId[];
  status: ScanStatus;
  progress: number;
  startedAt: string;
  finishedAt: string | null;
  requestedBy: string;
  durationMs: number | null;
  errorText: string | null;
  findingsCount: Record<Severity, number>;
  /** Relatório pentester gerado pela IA sob demanda. */
  aiReport: string | null;
  aiReportProvider: string | null;
}

export interface Finding {
  id: string;
  scanId: string;
  assetId: string;
  assetName: string;
  title: string;
  severity: Severity;
  status: FindingStatus;
  cwe: string | null;
  owaspCategory: string | null;
  cvss: number | null;
  engine: EngineId;
  endpoint: string;
  summary: string;
  /** Orientação de correção determinística (baseada em regra, não IA). */
  remediation: string;
  /** Confiança da detecção — checagens determinísticas são de alta confiança. */
  confidence: number;
  /** Trecho real capturado do alvo que comprova o achado. */
  evidenceSnippet: string | null;
  /** Análise aprofundada gerada pela IA sob demanda. */
  aiNote: string | null;
  detectedAt: string;
}

export interface Evidence {
  id: string;
  findingId: string;
  scanId: string;
  kind: "http_headers" | "http_response" | "cookie" | "config";
  label: string;
  content: string; // conteúdo real capturado
  sizeBytes: number;
  capturedAt: string;
}

export interface DashboardMetrics {
  riskScore: number;
  activeScans: number;
  openFindings: number;
  assetsMonitored: number;
  totalScans: number;
  findingsBySeverity: Record<Severity, number>;
  riskTrend: { label: string; value: number }[];
}

// ============================================================
// LLM Lab — Red team multi-provedor
// ============================================================

export type LlmProviderId = "gemini" | "groq" | "openrouter" | "openai" | "anthropic";

export type LlmVector =
  | "prompt_injection"
  | "system_prompt_leak"
  | "instruction_override"
  | "tool_abuse"
  | "delimiter_escape";

export interface LlmProbeResult {
  probeId: string;
  vector: LlmVector;
  provider: LlmProviderId;
  model: string;
  /** true = modelo resistiu ao ataque; false = ataque teve sucesso. */
  resisted: boolean;
  ok: boolean; // a chamada em si funcionou
  error: string | null;
  output: string; // resposta do modelo (truncada)
  latencyMs: number;
}

export interface LlmRun {
  id: string;
  startedAt: string;
  providers: LlmProviderId[];
  results: LlmProbeResult[];
}
