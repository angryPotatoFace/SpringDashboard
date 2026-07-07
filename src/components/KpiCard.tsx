import React from "react";
import { Card, CardContent } from "./ui/card";

export function KpiCard({
  title,
  value,
  icon,
  valueClassName = "text-slate-900",
}: {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card className="rounded-2xl border-none bg-white shadow-sm">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className={`mt-2 text-2xl font-bold ${valueClassName}`}>{value}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">{icon}</div>
      </CardContent>
    </Card>
  );
}
