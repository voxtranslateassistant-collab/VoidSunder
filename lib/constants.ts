import type {
  Severity,
  ScanProfile,
  ScanStatus,
  FindingStatus,
  AssetKind,
  EngineId,
} from "@/types";

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Médio",
  low: "Baixo",
  info: "Info",
};

/** Peso para o cálculo do score de risco do asset. */
export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 40,
  high: 20,
  medium: 8,
  low: 3,
  info: 0,
};

export const SEVERITY_COLOR: Record<Severity, string> = {
  critical: "#ff2a2a",
  high: "#ff6b2a",
  medium: "#ffc22a",
  low: "#2a7fff",
  info: "#6f879c",
};

export const SCAN_PROFILE_LABEL: Record<ScanProfile, string> = {
  passive_web: "Análise Passiva Web/API",
  llm_probe: "Sondagem de LLM",
};

export const SCAN_STATUS_LABEL: Record<ScanStatus, string> = {
  queued: "Na fila",
  claimed: "Reservado",
  running: "Em execução",
  completed: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

export const FINDING_STATUS_LABEL: Record<FindingStatus, string> = {
  open: "Aberto",
  confirmed: "Confirmado",
  false_positive: "Falso positivo",
  remediated: "Remediado",
  accepted_risk: "Risco aceito",
};

export const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  web_app: "Web App",
  api: "API",
  llm_endpoint: "LLM Endpoint",
};

export const ENGINE_LABEL: Record<EngineId, string> = {
  header_audit: "Auditoria de Headers",
  cookie_audit: "Auditoria de Cookies",
  tls_audit: "Transporte / TLS",
  cors_audit: "Política CORS",
  disclosure_audit: "Exposição de Informação",
  content_audit: "Conteúdo da Página",
  secret_scan: "Segredos Expostos",
  exposure_scan: "Arquivos Expostos",
  osint: "Coleta de Dados (OSINT)",
  tech_fingerprint: "Tecnologia",
  surface_map: "Superfície de Ataque",
  llm_probe: "Sondagem LLM",
};
