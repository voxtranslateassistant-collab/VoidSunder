import { getScanById, getFindingsByScan } from "@/lib/store";
import {
  SEVERITY_ORDER,
  SEVERITY_LABEL,
  SEVERITY_COLOR,
  ENGINE_LABEL,
} from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const scan = await getScanById(id);
  if (!scan) {
    return new Response("Scan não encontrado", { status: 404 });
  }
  const findings = (await getFindingsByScan(id)).sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  const rows = findings
    .map(
      (f) => `
      <tr>
        <td><span class="pill" style="border-color:${SEVERITY_COLOR[f.severity]};color:${SEVERITY_COLOR[f.severity]}">${SEVERITY_LABEL[f.severity]}</span></td>
        <td><strong>${esc(f.title)}</strong><div class="muted">${esc(f.owaspCategory ?? "")}</div></td>
        <td>${ENGINE_LABEL[f.engine]}</td>
        <td>${f.cvss?.toFixed(1) ?? "—"}</td>
        <td>${esc(f.remediation)}</td>
      </tr>`,
    )
    .join("");

  const summary = SEVERITY_ORDER.map(
    (s) =>
      `<span class="pill" style="border-color:${SEVERITY_COLOR[s]};color:${SEVERITY_COLOR[s]}">${SEVERITY_LABEL[s]}: ${scan.findingsCount[s]}</span>`,
  ).join(" ");

  // Converte o markdown da IA em HTML simples e seguro (texto escapado).
  function mdToHtml(md: string): string {
    const lines = md.split("\n");
    const out: string[] = [];
    let inList = false;
    let inCode = false;
    const closeList = () => {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
    };
    for (const raw of lines) {
      const line = raw.replace(/\r$/, "");
      if (/^```/.test(line.trim())) {
        if (!inCode) {
          closeList();
          out.push('<pre class="code"><code>');
          inCode = true;
        } else {
          out.push("</code></pre>");
          inCode = false;
        }
        continue;
      }
      if (inCode) {
        out.push(esc(line));
        continue;
      }
      const inline = (t: string) =>
        esc(t).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      if (/^###\s+/.test(line)) {
        closeList();
        out.push(`<h4>${inline(line.replace(/^###\s+/, ""))}</h4>`);
      } else if (/^##\s+/.test(line)) {
        closeList();
        out.push(`<h3>${inline(line.replace(/^##\s+/, ""))}</h3>`);
      } else if (/^[-*]\s+/.test(line)) {
        if (!inList) {
          out.push("<ul>");
          inList = true;
        }
        out.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
      } else if (line.trim() === "") {
        closeList();
      } else {
        closeList();
        out.push(`<p>${inline(line)}</p>`);
      }
    }
    if (inCode) out.push("</code></pre>");
    closeList();
    return out.join("\n");
  }

  const aiSection = scan.aiReport
    ? `<div class="ai">
         <div class="brand" style="color:#7a5cff">Análise do Analista de IA${scan.aiReportProvider ? " · " + esc(scan.aiReportProvider) : ""}</div>
         ${mdToHtml(scan.aiReport)}
       </div>`
    : `<div class="ai-empty">
         <strong>Análise de IA ainda não gerada.</strong>
         Abra este scan na plataforma (aba Scans) e clique em "Gerar relatório com IA"
         para incluir aqui as cadeias de ataque, a priorização e o prompt de correção.
       </div>`;

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<title>Relatório VoidSunder — ${esc(scan.assetName)}</title>
<style>
  :root{color-scheme:light}
  *{box-sizing:border-box}
  body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:40px;background:#f6f6f4;color:#101010}
  .sheet{max-width:900px;margin:0 auto;background:#fff;border:1px solid #ddd;padding:40px}
  h1{margin:0 0 4px;font-size:22px}
  .muted{color:#777;font-size:12px}
  .brand{letter-spacing:2px;text-transform:uppercase;font-size:11px;color:#2a7fff;font-weight:600}
  .meta{margin:16px 0;font-size:13px;color:#444}
  .pill{display:inline-block;border:1px solid;padding:2px 8px;border-radius:2px;font-size:11px;font-weight:600;margin:2px 0}
  table{width:100%;border-collapse:collapse;margin-top:24px;font-size:13px}
  th,td{text-align:left;padding:10px;border-bottom:1px solid #eee;vertical-align:top}
  th{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999}
  .ai{margin-top:32px;padding:20px;border:1px solid #e6e0ff;background:#faf9ff;border-radius:4px}
  .ai h3{font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#7a5cff;margin:18px 0 6px}
  .ai h4{font-size:14px;margin:14px 0 4px}
  .ai p{font-size:13px;line-height:1.55;margin:6px 0;color:#333}
  .ai ul{margin:6px 0;padding-left:20px}
  .ai li{font-size:13px;line-height:1.5;margin:3px 0;color:#333}
  .code{background:#0f0f12;color:#e8e8e8;padding:14px;border-radius:4px;overflow-x:auto;font-size:12px;white-space:pre-wrap;word-break:break-word}
  .ai-empty{margin-top:32px;padding:16px;border:1px dashed #ccc;background:#fafafa;font-size:13px;color:#555;border-radius:4px}
  @media print{body{background:#fff;padding:0}.sheet{border:none}}
</style></head>
<body><div class="sheet">
  <div class="brand">VoidSunder · Relatório de Segurança</div>
  <h1>${esc(scan.assetName)}</h1>
  <div class="muted">${esc(scan.targetUrl)}</div>
  <div class="meta">
    Executado em ${new Date(scan.startedAt).toLocaleString("pt-BR")} ·
    Duração ${scan.durationMs ? (scan.durationMs / 1000).toFixed(1) + "s" : "—"} ·
    ${findings.length} achado(s)
  </div>
  <div>${summary}</div>
  ${
    findings.length === 0
      ? '<p style="margin-top:24px;color:#2a8f2a">Nenhum problema de configuração detectado nesta análise passiva.</p>'
      : `<table><thead><tr><th>Sev.</th><th>Achado</th><th>Verificação</th><th>CVSS</th><th>Remediação</th></tr></thead><tbody>${rows}</tbody></table>`
  }
  ${aiSection}
  <p class="muted" style="margin-top:32px">Análise passiva (somente leitura da resposta HTTP). Não substitui um teste de intrusão completo.</p>
</div></body></html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
