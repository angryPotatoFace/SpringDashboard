import React, { createContext, useContext, useState } from "react";

type TabsContextValue = {
  value: string;
  onChange: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | null>(null);

type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

export function Tabs({ defaultValue = "", value, onValueChange, className = "", ...props }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = value ?? internalValue;

  const handleChange = (next: string) => {
    onValueChange?.(next);
    if (value === undefined) setInternalValue(next);
  };

  return (
    <TabsContext.Provider value={{ value: selectedValue, onChange: handleChange }}>
      <div className={className} {...props} />
    </TabsContext.Provider>
  );
}

export function TabsList({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" className={className} {...props} />;
}

export function TabsTrigger({ value, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = useContext(TabsContext);
  if (!context) return null;
  const isActive = context.value === value;
  const defaultClass = isActive ? "rounded-full bg-slate-900 text-white" : "rounded-full bg-transparent text-slate-600 hover:bg-slate-100";

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={[defaultClass, className].filter(Boolean).join(" ")}
      onClick={() => context.onChange(value)}
      {...props}
    />
  );
}

export function TabsContent({ value, className = "", ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = useContext(TabsContext);
  if (!context || context.value !== value) return null;
  return <div className={className} {...props} />;
}
