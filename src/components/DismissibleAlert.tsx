import React from "react";
import { Alert, AlertDescription } from "./ui/alert";
import { X } from "lucide-react";

export function DismissibleAlert({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Alert className="flex items-start justify-between gap-3">
      <AlertDescription className="flex-1">{children}</AlertDescription>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar aviso"
        className="rounded-md p-1 text-amber-700 transition hover:bg-amber-100 hover:text-amber-900"
      >
        <X className="h-4 w-4" />
      </button>
    </Alert>
  );
}
