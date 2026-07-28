import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-9 w-full border border-ash-border bg-surface-2 px-3",
      "text-sm text-bone-white outline-none transition-colors",
      "placeholder:text-graphite-veil",
      "hover:border-graphite-veil focus-visible:border-prism-cyan",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
