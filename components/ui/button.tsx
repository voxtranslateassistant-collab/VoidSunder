import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-bone-white text-pure-black hover:bg-white focus-visible:ring-bone-white",
  secondary:
    "bg-surface-3 text-bone-white border border-ash-border hover:border-graphite-veil hover:bg-surface-4 focus-visible:ring-graphite-veil",
  ghost:
    "bg-transparent text-fog-blue hover:text-bone-white hover:bg-surface-3 focus-visible:ring-graphite-veil",
  danger:
    "bg-prism-red/10 text-prism-red border border-prism-red/40 hover:bg-prism-red/20 focus-visible:ring-prism-red",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-none font-medium tracking-tight",
        "transition-colors duration-200 outline-none",
        "focus-visible:ring-1 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian",
        "disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
