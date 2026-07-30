import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const order = ["critical", "high", "medium", "low", "info"];
const labels: Record<string, string> = { critical: "Crítico", high: "Alto", medium: "Médio", low: "Baixo", info: "Informativo" };
const colors: Record<string, string> = { critical: "#a10f25", high: "#d65b12", medium: "#aa7500", low: "#1766b2", info: "#52606f" };
const esc = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const paragraphs = (value: string) => value.split("\n").filter(Boolean).map((line) => `<p>${esc(line)}</p>`).join("");

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: scan, error: scanError } = await supabase.from("scans").select("id, profile, started_at, finished_at, assets(name, target)").eq("id", id).maybeSingle();
  if (scanError || !scan) return new Response("Scan não encontrado.", { status: 404 });
  const { data: findings, error: findingsError } = await supabase.from("findings").select("title, severity, cwe, endpoint, summary, recommended_fix, validation_status, confidence, ai_triage_note").eq("scan_id", id);
  if (findingsError) return new Response("Não foi possível carregar os achados.", { status: 400 });
  const { data: consensusRuns } = await supabase.from("ai_consensus_runs").select("consensus, created_at").eq("scan_id", id).order("created_at", { ascending: false }).limit(1);
  const sorted = [...(findings ?? [])].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
  const asset = Array.isArray(scan.assets) ? scan.assets[0] : scan.assets;
  const counts = Object.fromEntries(order.map((severity) => [severity, sorted.filter((finding) => finding.severity === severity).length]));
  const priority = sorted.slice(0, 3);
  const rows = sorted.map((finding) => `<tr><td><span class="pill" style="color:${colors[finding.severity]};border-color:${colors[finding.severity]}">${labels[finding.severity]}</span></td><td><strong>${esc(finding.title)}</strong><div class="muted">${esc(finding.endpoint ?? "")}</div></td><td>${esc(finding.validation_status ?? "informativo")}</td><td>${esc(finding.summary ?? "")}</td><td>${esc(finding.recommended_fix ?? "Revisar configuração e repetir o reteste.")}</td></tr>`).join("");
  const summary = order.map((severity) => `<span class="pill" style="color:${colors[severity]};border-color:${colors[severity]}">${labels[severity]}: ${counts[severity]}</span>`).join(" ");
  const executive = sorted.length === 0 ? "Nenhum achado foi registrado nesta validação." : `Foram identificados ${sorted.length} achado(s), incluindo ${counts.critical + counts.high} de prioridade alta ou crítica. A correção deve começar pelos itens de maior severidade e ser confirmada por reteste.`;
  const plan = priority.length ? `<ol>${priority.map((finding) => `<li><strong>${esc(finding.title)}</strong> — ${esc(finding.recommended_fix ?? "Revisar configuração e aplicar a correção recomendada.")}</li>`).join("")}</ol>` : "<p>Nenhuma ação técnica pendente foi identificada.</p>";
  const notes = sorted.filter((finding) => finding.ai_triage_note).map((finding) => `<article><h4>${esc(finding.title)}</h4>${paragraphs(finding.ai_triage_note!)}</article>`).join("");
  const latestConsensus = (consensusRuns?.[0]?.consensus ?? null) as { report?: string; confidence?: number; providersUsed?: string[] } | null;
  const consensus = latestConsensus?.report ? `<section class="ai"><h2>Consenso entre IAs</h2><div class="muted">Provedores: ${esc((latestConsensus.providersUsed ?? []).join(" · "))} · Confiança: ${Math.round((latestConsensus.confidence ?? 0) * 100)}%</div>${paragraphs(latestConsensus.report)}</section>` : "";
  const aiNotes = notes ? `<section class="ai"><h2>Análises aprofundadas por IA</h2>${notes}</section>` : "";
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Relatório VoidSunder — ${esc(asset?.name ?? "Ativo")}</title><style>body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:40px;background:#f5f6f8;color:#15171c}.sheet{max-width:1000px;margin:auto;background:#fff;border:1px solid #dfe3e8;padding:42px}.brand{font-size:11px;letter-spacing:1.8px;text-transform:uppercase;color:#1666bd;font-weight:700}.muted{color:#697584;font-size:12px;margin-top:4px}h1{margin:7px 0 3px;font-size:26px}h2{font-size:15px;margin:0 0 12px}h4{font-size:13px;margin:18px 0 6px}.meta{margin:20px 0;color:#52606f;font-size:13px}.pill{display:inline-block;border:1px solid;padding:3px 8px;margin:2px;border-radius:3px;font-size:11px;font-weight:700}.box,.ai{margin-top:25px;padding:20px;border:1px solid #dfe3e8;background:#fbfcfe}.ai{border-color:#cfe2ff;background:#f8fbff}.box p,.ai p,.box li,.ai li{font-size:13px;line-height:1.55}.box ol{padding-left:20px}table{width:100%;border-collapse:collapse;margin-top:26px;font-size:13px}th,td{padding:12px 10px;border-bottom:1px solid #e8ebef;text-align:left;vertical-align:top}th{color:#697584;font-size:11px;text-transform:uppercase;letter-spacing:.8px}@media print{body{padding:0;background:white}.sheet{border:0}}</style></head><body><main class="sheet"><div class="brand">VoidSunder · Relatório de segurança</div><h1>${esc(asset?.name ?? "Ativo")}</h1><div class="muted">${esc(asset?.target ?? "")}</div><div class="meta">Executado em ${new Date(scan.started_at).toLocaleString("pt-BR")} · Perfil: ${esc(scan.profile)} · ${sorted.length} achado(s)</div><div>${summary}</div><section class="box"><h2>Resumo executivo</h2><p>${esc(executive)}</p></section><section class="box"><h2>Plano priorizado de correção</h2>${plan}</section>${sorted.length ? `<table><thead><tr><th>Severidade</th><th>Achado</th><th>Estado</th><th>Evidência resumida</th><th>Correção</th></tr></thead><tbody>${rows}</tbody></table>` : ""}${aiNotes}${consensus}<section class="box"><h2>Limitações e reteste</h2><p>Este relatório se baseia em validação autorizada, evidências minimizadas e respostas observadas no momento do scan. Após aplicar correções, solicite um reteste no VoidSunder para confirmar o estado atualizado.</p></section></main></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'" } });
}
