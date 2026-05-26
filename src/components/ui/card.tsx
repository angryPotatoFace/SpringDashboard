import React from "react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: CardProps) {
  return <div className={["rounded-2xl bg-white", className].filter(Boolean).join(" ")} {...props} />;
}

export function CardHeader({ className = "", ...props }: CardProps) {
  return <div className={["px-6 py-4 border-b border-slate-200", className].filter(Boolean).join(" ")} {...props} />;
}

export function CardTitle({ className = "", ...props }: CardProps) {
  return <h2 className={["text-base font-semibold", className].filter(Boolean).join(" ")} {...props} />;
}

export function CardContent({ className = "", ...props }: CardProps) {
  return <div className={["p-6", className].filter(Boolean).join(" ")} {...props} />;
}
