import { createClient } from "@/lib/supabase/server";
import type { Asset, Evidence, Finding } from "@/types";

export async function getOperationalAssets(): Promise<Asset[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("assets").select("*").order("last_scan_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []).map((asset) => ({ id: asset.id, name: asset.name, kind: asset.kind, environment: asset.environment, target: asset.target, owner: asset.owner_team ?? "—", tags: asset.tags ?? [], riskScore: asset.risk_score ?? 0, lastScanAt: asset.last_scan_at, createdAt: asset.created_at }));
}

export async function getOperationalFindings(): Promise<Finding[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("findings").select("*, assets(name)").order("detected_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((finding) => {
    const asset = Array.isArray(finding.assets) ? finding.assets[0] : finding.assets;
    return { id: finding.id, scanId: finding.scan_id, assetId: finding.asset_id, assetName: asset?.name ?? "Ativo", title: finding.title, severity: finding.severity, status: finding.status, cwe: finding.cwe, owaspCategory: finding.owasp_category, cvss: finding.cvss, engine: "surface_map", endpoint: finding.endpoint ?? "", summary: finding.summary ?? "", remediation: "Consulte a análise de IA e o relatório técnico para planejar a correção.", confidence: Number(finding.confidence ?? 0), evidenceSnippet: null, aiNote: finding.ai_triage_note, detectedAt: finding.detected_at } as Finding;
  });
}

export async function getOperationalEvidence(): Promise<Evidence[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("evidence_artifacts").select("*").order("captured_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((artifact) => ({ id: artifact.id, findingId: artifact.finding_id ?? "", scanId: artifact.job_id ?? "", kind: artifact.kind === "http_response" ? "http_response" : "config", label: artifact.label, content: artifact.redacted_preview ?? "Evidência privada disponível no bucket.", sizeBytes: Number(artifact.size_bytes ?? 0), capturedAt: artifact.captured_at }));
}
