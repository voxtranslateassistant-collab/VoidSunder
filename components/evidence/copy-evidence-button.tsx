"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyEvidenceButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return <Button type="button" size="sm" variant="secondary" onClick={copy} title="Copiar evidência mascarada">{copied ? <Check className="size-3.5 text-prism-lime" /> : <Copy className="size-3.5" />}{copied ? "Copiado" : "Copiar"}</Button>;
}
