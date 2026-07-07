import { Alert, AlertDescription } from "./ui/alert";
import { AlertTriangle, TrendingUp, HelpCircle } from "lucide-react";
import { Badge } from "./ui/badge";

export type SprintAlert = {
  id: string;
  type: "warning" | "danger" | "info";
  message: string;
  details?: string[];
};

type Props = {
  alerts: SprintAlert[];
};

function alertIcon(type: SprintAlert["type"]) {
  switch (type) {
    case "danger": return <AlertTriangle className="h-4 w-4 text-red-600" />;
    case "warning": return <TrendingUp className="h-4 w-4 text-amber-600" />;
    case "info": return <HelpCircle className="h-4 w-4 text-blue-600" />;
  }
}

function alertStyle(type: SprintAlert["type"]) {
  switch (type) {
    case "danger": return "border-red-200 bg-red-50";
    case "warning": return "border-amber-200 bg-amber-50";
    case "info": return "border-blue-200 bg-blue-50";
  }
}

function alertTextColor(type: SprintAlert["type"]) {
  switch (type) {
    case "danger": return "text-red-700";
    case "warning": return "text-amber-700";
    case "info": return "text-blue-700";
  }
}

export function SprintAlerts({ alerts }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert) => (
        <Alert key={alert.id} className={alertStyle(alert.type)}>
          <AlertDescription className={`flex flex-col gap-1 ${alertTextColor(alert.type)}`}>
            <div className="flex items-center gap-2 font-medium">
              {alertIcon(alert.type)}
              {alert.message}
            </div>
            {alert.details && alert.details.length > 0 && (
              <div className="ml-6 flex flex-wrap gap-1">
                {alert.details.map((detail, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{detail}</Badge>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}

/**
 * Generates smart alerts based on current sprint state.
 */
export function generateSprintAlerts({
  sprintLoadPercent,
  totalEquivalentDays,
  capacityNetDays,
  issuesWithoutEstimate,
  carryOverKeys,
  includedCount,
}: {
  sprintLoadPercent: number;
  totalEquivalentDays: number;
  capacityNetDays: number;
  issuesWithoutEstimate: string[];
  carryOverKeys: string[];
  includedCount: number;
}): SprintAlert[] {
  const alerts: SprintAlert[] = [];

  // Overload alert
  if (sprintLoadPercent > 100) {
    const excess = totalEquivalentDays - capacityNetDays;
    alerts.push({
      id: "overload",
      type: "danger",
      message: `Sprint sobrecargado al ${sprintLoadPercent.toFixed(0)}% — necesitas sacar ~${excess.toFixed(1)} dias de trabajo`,
    });
  } else if (sprintLoadPercent > 85) {
    alerts.push({
      id: "high-load",
      type: "warning",
      message: `Carga alta (${sprintLoadPercent.toFixed(0)}%) — queda poco margen para imprevistos`,
    });
  }

  // Issues without estimation
  if (issuesWithoutEstimate.length > 0) {
    alerts.push({
      id: "no-estimate",
      type: "warning",
      message: `${issuesWithoutEstimate.length} historia${issuesWithoutEstimate.length > 1 ? "s" : ""} sin estimacion`,
      details: issuesWithoutEstimate.slice(0, 8),
    });
  }

  // Carry-over
  if (carryOverKeys.length > 0) {
    alerts.push({
      id: "carry-over",
      type: "info",
      message: `${carryOverKeys.length} historia${carryOverKeys.length > 1 ? "s" : ""} arrastrada${carryOverKeys.length > 1 ? "s" : ""} del sprint anterior`,
      details: carryOverKeys.slice(0, 8),
    });
  }

  // Empty sprint
  if (includedCount === 0) {
    alerts.push({
      id: "empty",
      type: "info",
      message: "No hay items incluidos en el sprint",
    });
  }

  return alerts;
}
