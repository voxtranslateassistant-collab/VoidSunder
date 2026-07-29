import { SearchX } from "lucide-react";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <SearchX className="size-6 text-graphite-veil" strokeWidth={1.5} />
      <p className="mt-3 text-sm text-bone-white">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-graphite-veil">{description}</p>
    </div>
  );
}
