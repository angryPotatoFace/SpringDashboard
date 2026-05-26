import React from "react";

export function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={["block text-sm font-medium text-slate-700", className].filter(Boolean).join(" ")} {...props} />;
}
