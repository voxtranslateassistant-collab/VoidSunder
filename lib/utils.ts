import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.round(hours / 24);
  return `${days}d atrás`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

/** Encurta uma URL para exibição: origem + caminho, cortando query strings longas. */
export function shortUrl(raw: string, maxPath = 40): string {
  try {
    const u = new URL(raw);
    let path = u.pathname;
    if (path.length > maxPath) path = path.slice(0, maxPath) + "…";
    const hasQuery = u.search.length > 1;
    return `${u.host}${path}${hasQuery ? " ?…" : ""}`;
  } catch {
    return raw.length > maxPath ? raw.slice(0, maxPath) + "…" : raw;
  }
}
