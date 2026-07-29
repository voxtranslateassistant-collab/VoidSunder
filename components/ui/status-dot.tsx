import { cn } from "@/lib/utils";
import { SCAN_STATUS_LABEL } from "@/lib/constants";
import type { ScanStatus } from "@/types";

const STYLES: Record<ScanStatus, { dot: string; text: string }> = {
  queued: { dot: "bg-graphite-veil", text: "text-fog-blue" },
  claimed: { dot: "bg-prism-cyan", text: "text-prism-cyan" },
  running: {
    dot: "bg-prism-cyan animate-pulse-dot text-prism-cyan",
    text: "text-prism-cyan",
  },
  completed: { dot: "bg-prism-lime", text: "text-prism-lime" },
  failed: { dot: "bg-prism-red", text: "text-prism-red" },
  cancelled: { dot: "bg-graphite-veil", text: "text-graphite-veil" },
};

export function StatusDot({
  status,
  className,
}: {
  status: ScanStatus;
  className?: string;
}) {
  const style = STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      <span className={cn("text-micro-caps font-medium", style.text)}>
        {SCAN_STATUS_LABEL[status]}
      </span>
    </span>
  );
}
