import React from "react";

type TableProps = React.TableHTMLAttributes<HTMLTableElement>;

type TableSectionProps = React.HTMLAttributes<HTMLDivElement>;

export function Table({ className = "", ...props }: TableProps) {
  return <table className={["min-w-full divide-y divide-slate-200", className].filter(Boolean).join(" ")} {...props} />;
}

export function TableHeader({ className = "", ...props }: TableSectionProps) {
  return <thead className={[className].filter(Boolean).join(" ")} {...props} />;
}

export function TableBody({ className = "", ...props }: TableSectionProps) {
  return <tbody className={[className].filter(Boolean).join(" ")} {...props} />;
}

export function TableRow({ className = "", ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={[className].filter(Boolean).join(" ")} {...props} />;
}

export function TableHead({ className = "", ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={["whitespace-nowrap px-3 py-3 text-left text-sm font-semibold text-slate-900", className].filter(Boolean).join(" ")} {...props} />;
}

export function TableCell({ className = "", ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={["whitespace-nowrap px-3 py-3 text-sm text-slate-700", className].filter(Boolean).join(" ")} {...props} />;
}
