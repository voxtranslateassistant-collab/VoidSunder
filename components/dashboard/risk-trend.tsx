import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RiskTrend({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const max = Math.max(...data.map((d) => d.value), 100);
  const width = 100;
  const height = 40;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d.value / max) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const area = `0,${height} ${points} ${width},${height}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tendência de risco — 7 semanas</CardTitle>
        <span className="text-xs tabular-nums text-prism-red">
          +{data[data.length - 1].value - data[0].value} pts
        </span>
      </CardHeader>
      <CardContent>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-32 w-full"
          role="img"
          aria-label="Gráfico de tendência do risco agregado"
        >
          <defs>
            <linearGradient id="riskFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff2a2a" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ff2a2a" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#riskFill)" />
          <polyline
            points={points}
            fill="none"
            stroke="#ff2a2a"
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <div className="mt-2 flex justify-between">
          {data.map((d) => (
            <span
              key={d.label}
              className="text-[10px] tracking-wide text-graphite-veil"
            >
              {d.label}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
