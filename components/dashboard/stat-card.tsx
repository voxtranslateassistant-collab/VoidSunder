import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  suffix,
  delta,
  deltaGoodWhen = "down",
  accent,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  delta?: number;
  deltaGoodWhen?: "up" | "down";
  accent?: string;
}) {
  const hasDelta = typeof delta === "number" && delta !== 0;
  const rising = (delta ?? 0) > 0;
  const good = hasDelta && (deltaGoodWhen === "up" ? rising : !rising);
  const Arrow = rising ? ArrowUpRight : ArrowDownRight;

  return (
    <Card interactive className="p-5">
      <p className="text-micro-caps text-graphite-veil">{label}</p>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className="text-4xl font-medium tracking-tight tabular-nums"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-sm text-graphite-veil">{suffix}</span>
        )}
      </div>
      {hasDelta && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1 text-xs",
            good ? "text-prism-lime" : "text-prism-red",
          )}
        >
          <Arrow className="size-3.5" strokeWidth={2} />
          <span className="tabular-nums">{Math.abs(delta!)}</span>
          <span className="text-graphite-veil">vs. semana anterior</span>
        </div>
      )}
    </Card>
  );
}
