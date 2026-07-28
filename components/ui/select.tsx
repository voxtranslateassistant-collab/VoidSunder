import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, children, id, ...props }, ref) => {
    const generated = React.useId();
    const selectId = id ?? generated;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="text-micro-caps text-graphite-veil"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              "h-9 w-full appearance-none border border-ash-border bg-surface-2 py-0 pr-8 pl-3",
              "text-sm text-bone-white outline-none transition-colors",
              "hover:border-graphite-veil focus-visible:border-prism-cyan",
              className,
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-graphite-veil"
            strokeWidth={1.5}
          />
        </div>
      </div>
    );
  },
);
Select.displayName = "Select";
