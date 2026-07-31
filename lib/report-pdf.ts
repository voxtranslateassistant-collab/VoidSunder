import type PDFDocument from "pdfkit";

type PdfFinding = {
  title: string;
  severity: string;
  endpoint: string | null;
  summary: string | null;
  recommended_fix: string | null;
  validation_status: string | null;
  confidence: number | null;
  ai_triage_note: string | null;
};

export type SecurityReportPdfInput = {
  assetName: string;
  assetTarget: string;
  profile: string;
  startedAt: string;
  findings: PdfFinding[];
  executive: string;
  consensus?: { report?: string; confidence?: number; providersUsed?: string[] } | null;
};

const palette: Record<string, string> = { critical: "#b42318", high: "#e25d16", medium: "#aa7500", low: "#1766b2", info: "#52606f" };
const severityLabel: Record<string, string> = { critical: "CRÍTICO", high: "ALTO", medium: "MÉDIO", low: "BAIXO", info: "INFORMATIVO" };
const safe = (value: string | null | undefined) => (value ?? "—").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");

async function loadPdfDocument() {
  const module = await import("pdfkit");
  const constructor = module.default ?? module;
  if (typeof constructor !== "function") throw new Error("O gerador de PDF não foi carregado no ambiente de execução.");
  return constructor as unknown as typeof PDFDocument;
}

export async function createSecurityReportPdf(input: SecurityReportPdfInput): Promise<Buffer> {
  const PDFDocument = await loadPdfDocument();
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 48, bufferPages: true, info: { Title: `Relatório VoidSunder - ${input.assetName}`, Author: "VoidSunder" } });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const heading = (text: string) => { document.moveDown(0.7).font("Helvetica-Bold").fontSize(13).fillColor("#0b3c75").text(text).moveDown(0.25); };
    const paragraph = (text: string) => document.font("Helvetica").fontSize(9.5).fillColor("#17212d").text(safe(text), { lineGap: 3 });
    const ensureSpace = (height = 100) => { if (document.y + height > document.page.height - 60) document.addPage(); };

    document.fillColor("#1268c4").font("Helvetica-Bold").fontSize(10).text("VOIDSUNDER · RELATÓRIO DE SEGURANÇA", { characterSpacing: 1.2 });
    document.moveDown(0.8).fillColor("#121826").fontSize(24).text(safe(input.assetName));
    document.font("Helvetica").fontSize(10).fillColor("#52606f").text(safe(input.assetTarget));
    document.moveDown(0.8).fontSize(9).text(`Executado em ${new Date(input.startedAt).toLocaleString("pt-BR")} · Perfil: ${safe(input.profile)} · ${input.findings.length} achado(s)`);
    document.moveDown(1).strokeColor("#d8dee8").moveTo(48, document.y).lineTo(547, document.y).stroke();

    heading("Resumo executivo");
    paragraph(input.executive);

    heading("Plano priorizado de correção");
    const priority = input.findings.slice(0, 3);
    if (!priority.length) paragraph("Nenhuma ação técnica pendente foi identificada nesta validação.");
    for (const [index, finding] of priority.entries()) { ensureSpace(55); document.font("Helvetica-Bold").fontSize(10).fillColor("#17212d").text(`${index + 1}. ${safe(finding.title)}`); paragraph(safe(finding.recommended_fix)); document.moveDown(0.2); }

    heading("Achados e recomendações");
    if (!input.findings.length) paragraph("Nenhum achado foi registrado nesta validação.");
    for (const finding of input.findings) {
      ensureSpace(165);
      const cardTop = document.y;
      document.roundedRect(48, cardTop, 499, 22, 2).fillAndStroke("#f5f7fa", "#d8dee8");
      document.fillColor(palette[finding.severity] ?? "#52606f").font("Helvetica-Bold").fontSize(8).text(severityLabel[finding.severity] ?? finding.severity.toUpperCase(), 55, cardTop + 7, { lineBreak: false });
      document.fillColor("#17212d").font("Helvetica-Bold").fontSize(11).text(safe(finding.title), 120, cardTop + 5, { width: 415, lineBreak: false });
      document.y = cardTop + 32;
      document.font("Helvetica").fontSize(8.5).fillColor("#52606f").text(`${safe(finding.validation_status)} · Confiança: ${Math.round((Number(finding.confidence) || 0) * 100)}%`);
      document.font("Helvetica-Bold").fontSize(8.5).fillColor("#17212d").text("Evidência resumida"); paragraph(safe(finding.summary));
      document.font("Helvetica-Bold").fontSize(8.5).fillColor("#17212d").text("Correção recomendada"); paragraph(safe(finding.recommended_fix));
      if (finding.ai_triage_note) { document.font("Helvetica-Bold").fontSize(8.5).fillColor("#17212d").text("Análise por IA"); paragraph(finding.ai_triage_note); }
      document.moveDown(0.7);
    }

    if (input.consensus?.report) {
      ensureSpace(120); heading("Consenso entre IAs");
      paragraph(`Provedores: ${(input.consensus.providersUsed ?? []).join(" · ") || "não informado"} · Confiança: ${Math.round((input.consensus.confidence ?? 0) * 100)}%`);
      document.moveDown(0.2); paragraph(input.consensus.report);
    }

    ensureSpace(80); heading("Limitações e reteste");
    paragraph("Este relatório se baseia em validação autorizada, evidências minimizadas e respostas observadas no momento do scan. Após aplicar correções, solicite um reteste no VoidSunder para confirmar o estado atualizado.");

    const range = document.bufferedPageRange();
    for (let page = range.start; page < range.start + range.count; page += 1) {
      document.switchToPage(page);
      document.font("Helvetica").fontSize(8).fillColor("#6b7280").text(`VoidSunder · Relatório confidencial · Página ${page + 1} de ${range.count}`, 48, document.page.height - 38, { align: "center", width: 499 });
    }
    document.end();
  });
}
