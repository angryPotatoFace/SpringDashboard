import React from "react";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "destructive" | "outline";
};

const styles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "bg-slate-100 text-slate-900",
  secondary: "bg-slate-200 text-slate-800",
  destructive: "bg-red-100 text-red-700",
  outline: "border border-slate-300 bg-transparent text-slate-800",
};

export function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  return (
    <span className={["inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", styles[variant], className].filter(Boolean).join(" ")} {...props} />
  );
}
