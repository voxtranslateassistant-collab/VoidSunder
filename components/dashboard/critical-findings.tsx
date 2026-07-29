import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityPill } from "@/components/ui/severity-pill";
import { Badge } from "@/components/ui/badge";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { FINDING_STATUS_LABEL } from "@/lib/constants";
import { formatRelativeTime } from "@/lib/utils";
import type { Finding } from "@/types";

export function CriticalFindings({ findings }: { findings: Finding[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Achados prioritários</CardTitle>
        <Link
          href="/findings"
          className="text-micro-caps text-fog-blue transition-colors hover:text-bone-white"
        >
          Ver todos
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <thead>
            <tr>
              <Th>Achado</Th>
              <Th className="w-28">Severidade</Th>
              <Th className="w-36">Asset</Th>
              <Th className="w-28">Status</Th>
              <Th className="w-20 text-right">CVSS</Th>
              <Th className="w-24 text-right">Detectado</Th>
            </tr>
          </thead>
          <tbody>
            {findings.map((f) => (
              <Tr key={f.id}>
                <Td>
                  <Link
                    href={`/findings/${f.id}`}
                    className="block max-w-md truncate transition-colors hover:text-prism-cyan"
                  >
                    {f.title}
                  </Link>
                  {f.owaspCategory && (
                    <span className="mt-1 block text-xs text-graphite-veil">
                      {f.owaspCategory}
                    </span>
                  )}
                </Td>
                <Td>
                  <SeverityPill severity={f.severity} />
                </Td>
                <Td className="text-fog-blue">{f.assetName}</Td>
                <Td>
                  <Badge
                    tone={
                      f.status === "confirmed"
                        ? "red"
                        : f.status === "remediated"
                          ? "lime"
                          : "neutral"
                    }
                  >
                    {FINDING_STATUS_LABEL[f.status]}
                  </Badge>
                </Td>
                <Td className="text-right tabular-nums">
                  {f.cvss?.toFixed(1) ?? "—"}
                </Td>
                <Td className="text-right text-xs text-graphite-veil">
                  {formatRelativeTime(f.detectedAt)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  );
}
