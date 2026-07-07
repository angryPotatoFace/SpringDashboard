import type { EstimateUnit, IssueType } from "../types";

export function usesStoryPoints(type: IssueType) {
  return type === "Historia" || type === "Tarea";
}

export function usesHours(type: IssueType) {
  return type === "Defecto" || type === "INC" || type === "Incidente" || type === "Incidencia" || type === "Otro";
}

export function getDefaultEstimateUnit(type: IssueType): EstimateUnit {
  return usesStoryPoints(type) ? "pts" : "h";
}

export function getAllowedEstimateUnits(type: IssueType): EstimateUnit[] {
  return usesStoryPoints(type) ? ["pts", "d"] : ["h", "d"];
}

export function sanitizeEstimateUnit(type: IssueType, value?: string | null): EstimateUnit {
  const raw = (value || "").trim() as EstimateUnit;
  return getAllowedEstimateUnits(type).includes(raw) ? raw : getDefaultEstimateUnit(type);
}

export function sanitizeEstimateValues(type: IssueType, estimateUnit: EstimateUnit, estimateRaw: number) {
  const raw = Math.max(0, Number(estimateRaw) || 0);
  const unit = sanitizeEstimateUnit(type, estimateUnit);

  if (unit === "d") {
    return { estimateUnit: unit, estimateRaw: raw, storyPoints: 0, hours: 0, manualDays: raw };
  }
  if (unit === "pts") {
    return { estimateUnit: unit, estimateRaw: raw, storyPoints: usesStoryPoints(type) ? raw : 0, hours: 0, manualDays: 0 };
  }
  return { estimateUnit: unit, estimateRaw: raw, storyPoints: 0, hours: usesHours(type) ? raw : 0, manualDays: 0 };
}

export function calculateEquivalentDays(storyPoints: number, hours: number, manualDays: number, daysPerStoryPoint: number, hoursPerDay: number) {
  return storyPoints * daysPerStoryPoint + hours / hoursPerDay + manualDays;
}

export function roundEstimateValue(value: number) {
  return Math.round(value * 100) / 100;
}

export function convertEquivalentDaysToEstimateRaw(equivalentDays: number, estimateUnit: EstimateUnit, daysPerStoryPoint: number, hoursPerDay: number) {
  if (estimateUnit === "d") return roundEstimateValue(equivalentDays);
  if (estimateUnit === "pts") return daysPerStoryPoint > 0 ? roundEstimateValue(equivalentDays / daysPerStoryPoint) : 0;
  return roundEstimateValue(equivalentDays * hoursPerDay);
}

export function getEstimateUnitLabel(unit: EstimateUnit) {
  if (unit === "pts") return "pts";
  if (unit === "h") return "h";
  return "dias";
}
