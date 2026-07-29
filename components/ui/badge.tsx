import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "cyan" | "lime" | "red" | "amber";

const TONES: Record<Tone, string> = {
  neutral: "border-ash-border text-fog-blue",
  cyan: "border-prism-cyan/40 text-prism-cyan bg-prism-cyan/8",
  lime: "border-prism-lime/40 text-prism-lime bg-prism-lime/8",
  red: "border-prism-red/40 text-prism-red bg-prism-red/8",
  amber: "border-[#ffc22a]/40 text-[#ffc22a] bg-[#ffc22a]/8",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 text-micro-caps font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
