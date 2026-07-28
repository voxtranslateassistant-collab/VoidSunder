"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Table, Th, Td, Tr } from "@/components/ui/table";
import { SeverityPill } from "@/components/ui/severity-pill";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

import {
  SEVERITY_ORDER,
  SEVERITY_LABEL,
  FINDING_STATUS_LABEL,
  ENGINE_LABEL,
} from "@/lib/constants";
import { formatRelativeTime, shortUrl } from "@/lib/utils";
import type { Finding, Severity, FindingStatus, EngineId } from "@/types";

type SeverityFilter = Severity | "all";
type StatusFilter = FindingStatus | "all";
type EngineFilter = EngineId | "all";

const STATUS_TONE: Record<
  FindingStatus,
  "neutral" | "red" | "lime" | "amber"
> = {
  open: "amber",
  confirmed: "red",
  false_positive: "neutral",
  remediated: "lime",
  accepted_risk: "neutral",
};

export function FindingsExplorer({ findings }: { findings: Finding[] }) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState<SeverityFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [engine, setEngine] = useState<EngineFilter>("all");

  const hasFilters =
    query !== "" || severity !== "all" || status !== "all" || engine !== "all";

  function reset() {
    setQuery("");
    setSeverity("all");
    setStatus("all");
    setEngine("all");
  }

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return findings
      .filter((f) => {
        if (severity !== "all" && f.severity !== severity) return false;
        if (status !== "all" && f.status !== status) return false;
        if (engine !== "all" && f.engine !== engine) return false;
        if (!needle) return true;
        return (
          f.title.toLowerCase().includes(needle) ||
          f.assetName.toLowerCase().includes(needle) ||
          f.endpoint.toLowerCase().includes(needle) ||
          (f.cwe?.toLowerCase().includes(needle) ?? false) ||
          (f.owaspCategory?.toLowerCase().includes(needle) ?? false)
        );
      })
      .sort((a, b) => {
        const bySeverity =
          SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
        if (bySeverity !== 0) return bySeverity;
        return (
          new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
        );
      });
  }, [findings, query, severity, status, engine]);

  const counts = useMemo(() => {
    const acc = { critical: 0, high: 0, medium: 0, low: 0, info: 0 } as Record<
      Severity,
      number
    >;
    for (const f of visible) acc[f.severity] += 1;
    return acc;
  }, [visible]);

  return (
    <div className="space-y-4">
      {/* Barra de filtros */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-56 flex-1">
            <label
              htmlFor="finding-search"
              className="text-micro-caps text-graphite-veil"
            >
              Buscar
            </label>
            <div className="relative mt-1.5">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-graphite-veil"
                strokeWidth={1.5}
              />
              <Input
                id="finding-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Título, asset, endpoint, CWE…"
                className="pl-9"
              />
            </div>
          </div>

          <Select
            label="Severidade"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as SeverityFilter)}
            className="w-40"
          >
            <option value="all">Todas</option>
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </Select>

          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="w-44"
          >
            <option value="all">Todos</option>
            {(
              Object.keys(FINDING_STATUS_LABEL) as FindingStatus[]
            ).map((s) => (
              <option key={s} value={s}>
                {FINDING_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>

          <Select
            label="Engine"
            value={engine}
            onChange={(e) => setEngine(e.target.value as EngineFilter)}
            className="w-44"
          >
            <option value="all">Todas</option>
            {(Object.keys(ENGINE_LABEL) as EngineId[]).map((e) => (
              <option key={e} value={e}>
                {ENGINE_LABEL[e]}
              </option>
            ))}
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <X className="size-3.5" strokeWidth={2} />
              Limpar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Resumo da seleção */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-micro-caps text-graphite-veil">
          {visible.length} de {findings.length} achados
        </span>
        <div className="flex flex-wrap gap-1.5">
          {SEVERITY_ORDER.filter((s) => counts[s] > 0).map((s) => (
            <SeverityPill key={s} severity={s} className="gap-1">
              <span className="tabular-nums">{counts[s]}</span>
            </SeverityPill>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          {visible.length === 0 ? (
            <EmptyState
              title="Nenhum achado corresponde aos filtros"
              description="Ajuste a busca ou limpe os filtros para ver todos os achados."
            />
          ) : (
            <Table className="table-fixed">
              <thead>
                <tr>
                  <Th className="w-[38%]">Achado</Th>
                  <Th className="w-24">Severidade</Th>
                  <Th className="w-40">Asset</Th>
                  <Th className="w-28">Status</Th>
                  <Th className="w-36">Engine</Th>
                  <Th className="w-16 text-right">CVSS</Th>
                  <Th className="w-24 text-right">Detectado</Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((f) => (
                  <Tr key={f.id}>
                    <Td>
                      <Link
                        href={`/findings/${f.id}`}
                        className="block truncate transition-colors hover:text-prism-cyan"
                        title={f.title}
                      >
                        {f.title}
                      </Link>
                      <span
                        className="mt-1 block truncate font-mono text-xs text-graphite-veil"
                        title={f.endpoint}
                      >
                        {shortUrl(f.endpoint)}
                      </span>
                    </Td>
                    <Td>
                      <SeverityPill severity={f.severity} />
                    </Td>
                    <Td className="truncate text-fog-blue" title={f.assetName}>
                      {f.assetName}
                    </Td>
                    <Td>
                      <Badge tone={STATUS_TONE[f.status]}>
                        {FINDING_STATUS_LABEL[f.status]}
                      </Badge>
                    </Td>
                    <Td className="truncate text-xs text-fog-blue">
                      {ENGINE_LABEL[f.engine]}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
