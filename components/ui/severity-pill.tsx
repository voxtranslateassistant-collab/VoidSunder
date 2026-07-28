import * as React from "react";
import { cn } from "@/lib/utils";
import { SEVERITY_LABEL } from "@/lib/constants";
import type { Severity } from "@/types";

const STYLES: Record<Severity, string> = {
  critical: "border-[#ff2a2a]/50 text-[#ff2a2a] bg-[#ff2a2a]/10",
  high: "border-[#ff6b2a]/50 text-[#ff6b2a] bg-[#ff6b2a]/10",
  medium: "border-[#ffc22a]/50 text-[#ffc22a] bg-[#ffc22a]/10",
  low: "border-[#2a7fff]/50 text-[#2a7fff] bg-[#2a7fff]/10",
  info: "border-[#6f879c]/50 text-[#6f879c] bg-[#6f879c]/10",
};

const DOTS: Record<Severity, string> = {
  critical: "bg-[#ff2a2a]",
  high: "bg-[#ff6b2a]",
  medium: "bg-[#ffc22a]",
  low: "bg-[#2a7fff]",
  info: "bg-[#6f879c]",
};

export function SeverityPill({
  severity,
  className,
  children,
}: {
  severity: Severity;
  className?: string;
  /** Conteúdo extra à direita do rótulo — usado para contadores. */
  children?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 text-micro-caps font-medium",
        STYLES[severity],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOTS[severity])} />
      {SEVERITY_LABEL[severity]}
      {children}
    </span>
  );
}
