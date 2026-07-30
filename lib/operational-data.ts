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

export async function getOperationalFindingById(id: string): Promise<Finding | undefined> {
  return (await getOperationalFindings()).find((finding) => finding.id === id);
}

export async function setOperationalFindingAiNote(id: string, note: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("findings").update({ ai_triage_note: note }).eq("id", id);
  if (error) throw error;
}

export async function getOperationalEvidence(): Promise<Evidence[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("evidence_artifacts").select("*").order("captured_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((artifact) => ({ id: artifact.id, findingId: artifact.finding_id ?? "", scanId: artifact.job_id ?? "", kind: artifact.kind === "http_response" ? "http_response" : "config", label: artifact.label, content: artifact.redacted_preview ?? "Evidência privada disponível no bucket.", sizeBytes: Number(artifact.size_bytes ?? 0), capturedAt: artifact.captured_at }));
}

export async function getOperationalEvidenceByFinding(findingId: string) {
  const supabase = await createClient();
  const mapArtifact = (artifact: { id: string; finding_id: string | null; job_id: string | null; kind: string; label: string; redacted_preview: string | null; size_bytes: number | string | null; captured_at: string }) => ({
    id: artifact.id,
    findingId: artifact.finding_id ?? findingId,
    scanId: artifact.job_id ?? "",
    kind: artifact.kind === "http_response" ? "http_response" : "config",
    label: artifact.label,
    content: artifact.redacted_preview ?? "Evidência privada disponível no cofre.",
    sizeBytes: Number(artifact.size_bytes ?? 0),
    capturedAt: artifact.captured_at,
  } as Evidence);

  const { data: directlyLinked, error: directError } = await supabase
    .from("evidence_artifacts").select("*").eq("finding_id", findingId).order("captured_at", { ascending: false });
  if (directError) throw directError;
  if (directlyLinked?.length) return directlyLinked.map(mapArtifact);

  const { data: finding, error: findingError } = await supabase
    .from("findings").select("scan_id").eq("id", findingId).maybeSingle();
  if (findingError) throw findingError;
  if (!finding?.scan_id) return [];
  const { data: job, error: jobError } = await supabase
    .from("scan_jobs").select("id").contains("configuration", { legacy_scan_id: finding.scan_id }).limit(1).maybeSingle();
  if (jobError) throw jobError;
  if (!job) return [];
  const { data: jobArtifacts, error: artifactError } = await supabase
    .from("evidence_artifacts").select("*").eq("job_id", job.id).order("captured_at", { ascending: false });
  if (artifactError) throw artifactError;
  return (jobArtifacts ?? []).map(mapArtifact);
}
