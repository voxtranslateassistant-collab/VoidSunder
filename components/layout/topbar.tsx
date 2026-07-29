import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-6 border-b border-ash-border bg-surface-0 px-8">
      <div className="min-w-0">
        <h1 className="truncate text-base font-medium tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-xs text-graphite-veil">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {action}
        <Button variant="ghost" size="sm" aria-label="Buscar">
          <Search className="size-4" strokeWidth={1.5} />
        </Button>
        <Button variant="ghost" size="sm" aria-label="Notificações">
          <Bell className="size-4" strokeWidth={1.5} />
        </Button>
        <div className="ml-1 flex size-8 items-center justify-center border border-ash-border bg-surface-3 text-xs">
          WO
        </div>
      </div>
    </header>
  );
}
