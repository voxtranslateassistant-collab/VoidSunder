import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEVERITY_COLOR, SEVERITY_LABEL, SEVERITY_ORDER } from "@/lib/constants";
import type { Severity } from "@/types";

export function SeverityBreakdown({
  data,
}: {
  data: Record<Severity, number>;
}) {
  const total = SEVERITY_ORDER.reduce((sum, s) => sum + data[s], 0) || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Achados por severidade</CardTitle>
        <span className="text-xs tabular-nums text-graphite-veil">
          {total} total
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra agregada */}
        <div className="flex h-1.5 w-full overflow-hidden">
          {SEVERITY_ORDER.map((s) =>
            data[s] > 0 ? (
              <div
                key={s}
                style={{
                  width: `${(data[s] / total) * 100}%`,
                  backgroundColor: SEVERITY_COLOR[s],
                }}
                title={`${SEVERITY_LABEL[s]}: ${data[s]}`}
              />
            ) : null,
          )}
        </div>

        <ul className="space-y-2.5">
          {SEVERITY_ORDER.map((s) => (
            <li key={s} className="flex items-center gap-3">
              <span
                className="size-2 shrink-0"
                style={{ backgroundColor: SEVERITY_COLOR[s] }}
              />
              <span className="w-16 text-xs text-fog-blue">
                {SEVERITY_LABEL[s]}
              </span>
              <div className="h-1 flex-1 bg-surface-4">
                <div
                  className="h-full transition-[width] duration-700"
                  style={{
                    width: `${(data[s] / total) * 100}%`,
                    backgroundColor: SEVERITY_COLOR[s],
                  }}
                />
              </div>
              <span className="w-8 text-right text-xs tabular-nums text-bone-white">
                {data[s]}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
