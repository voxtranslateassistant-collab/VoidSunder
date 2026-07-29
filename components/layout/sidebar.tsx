"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Radar,
  Bug,
  Boxes,
  Network,
  BrainCircuit,
  Archive,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  {
    href: "/dashboard",
    label: "Painel",
    icon: LayoutDashboard,
    desc: "Visão geral: risco médio, achados abertos e prioridades.",
  },
  {
    href: "/scans/new",
    label: "Novo Scan",
    icon: Radar,
    desc: "Cole a URL de um alvo autorizado e execute a varredura.",
  },
  {
    href: "/findings",
    label: "Achados",
    icon: Bug,
    desc: "Todos os problemas encontrados, com filtros e busca.",
  },
  {
    href: "/assets",
    label: "Alvos",
    icon: Boxes,
    desc: "Inventário dos sites/APIs já escaneados e seu risco.",
  },
  {
    href: "/inventory",
    label: "Inventário",
    icon: Network,
    desc: "Tecnologias, rotas e superfícies confirmadas em scans autorizados.",
  },
  {
    href: "/llm-lab",
    label: "Lab de IA",
    icon: BrainCircuit,
    desc: "Testa a segurança de modelos de IA (não de sites).",
  },
  {
    href: "/evidence",
    label: "Cofre de Provas",
    icon: Archive,
    desc: "As evidências reais que comprovam cada achado.",
  },
  {
    href: "/reports",
    label: "Relatórios",
    icon: FileText,
    desc: "Relatório por scan, com análise de IA e versão imprimível.",
  },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-ash-border bg-surface-0">
      <div className="flex h-16 items-center gap-2.5 border-b border-ash-border px-5">
        <ShieldCheck className="size-5 text-prism-cyan" strokeWidth={1.5} />
        <span className="text-sm font-medium tracking-tight">VoidSunder</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV.map(({ href, label, icon: Icon, desc }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              title={`${label} — ${desc}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 px-5 py-2.5 text-sm transition-colors",
                active
                  ? "bg-surface-2 text-bone-white"
                  : "text-fog-blue hover:bg-surface-1 hover:text-bone-white",
              )}
            >
              {active && (
                <span className="absolute inset-y-0 left-0 w-px bg-prism-cyan" />
              )}
              <Icon className="size-4" strokeWidth={1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ash-border px-5 py-4">
        <p className="text-micro-caps text-graphite-veil">Ambiente</p>
        <p className="mt-1 text-xs text-fog-blue">Produção</p>
      </div>
    </aside>
  );
}
