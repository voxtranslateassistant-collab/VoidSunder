import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  color = "var(--color-prism-cyan)",
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-0.5 w-full bg-surface-4", className)}
    >
      <div
        className="h-full transition-[width] duration-700 ease-out"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  );
}
