import * as React from "react";

// Renderizador de markdown minimalista e seguro (sem HTML bruto).
// Cobre: ## / ### títulos, listas com - ou *, **negrito**, `código`, parágrafos.

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="text-bone-white">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      nodes.push(
        <code
          key={`${keyBase}-c${i}`}
          className="bg-surface-3 px-1 py-0.5 font-mono text-xs text-prism-cyan"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + tok.length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    const items = [...list];
    blocks.push(
      <ul key={`ul${key++}`} className="my-2 space-y-1.5 pl-1">
        {items.map((it, idx) => (
          <li key={idx} className="flex gap-2 text-sm text-fog-blue">
            <span className="mt-1.5 size-1 shrink-0 bg-prism-cyan" />
            <span>{renderInline(it, `li${key}-${idx}`)}</span>
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^###\s+/.test(line)) {
      flushList();
      blocks.push(
        <h4 key={key++} className="mt-4 mb-1 text-sm font-medium text-bone-white">
          {renderInline(line.replace(/^###\s+/, ""), `h4${key}`)}
        </h4>,
      );
    } else if (/^##\s+/.test(line)) {
      flushList();
      blocks.push(
        <h3
          key={key++}
          className="mt-5 mb-2 text-micro-caps font-medium text-prism-cyan"
        >
          {line.replace(/^##\s+/, "")}
        </h3>,
      );
    } else if (/^[-*]\s+/.test(line)) {
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (line.trim() === "") {
      flushList();
    } else {
      flushList();
      blocks.push(
        <p key={key++} className="my-2 text-sm leading-relaxed text-fog-blue">
          {renderInline(line, `p${key}`)}
        </p>,
      );
    }
  }
  flushList();

  return <div>{blocks}</div>;
}
