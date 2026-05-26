import React from "react";

export function Alert({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={["rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900", className].filter(Boolean).join(" ")} {...props} />
  );
}

export function AlertDescription({ className = "", ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={["m-0 text-sm leading-6", className].filter(Boolean).join(" ")} {...props} />;
}
