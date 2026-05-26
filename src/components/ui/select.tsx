import React, { createContext, useContext, useState } from "react";

type SelectContextType = {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const SelectContext = createContext<SelectContextType | null>(null);

export function Select({ value, onValueChange, children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
      <div className={["relative", className].filter(Boolean).join(" ")} {...props}>
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = useContext(SelectContext);
  if (!context) return null;

  return (
    <button
      type="button"
      className={[
        "flex w-full items-center justify-between rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => context.setOpen((current) => !current)}
      {...props}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder, className = "", ...props }: React.HTMLAttributes<HTMLSpanElement> & { placeholder?: string }) {
  const context = useContext(SelectContext);
  if (!context) return null;
  const content = context.value || placeholder || "";
  return (
    <span className={className} {...props}>
      {content}
    </span>
  );
}

export function SelectContent({ children, className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const context = useContext(SelectContext);
  if (!context || !context.open) return null;
  return (
    <div
      className={["absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg", className]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = useContext(SelectContext);
  if (!context) return null;

  const isSelected = context.value === value;
  return (
    <button
      type="button"
      className={[
        "w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-100",
        isSelected ? "bg-slate-100 font-semibold" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={() => {
        context.onValueChange(value);
        context.setOpen(false);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
