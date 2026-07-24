import type { BacklogFilters, DeveloperCapacity, EstimateUnit, Issue, Meeting } from "../types";
import { SIN_DEFINIR } from "../constants";
import { normalizeProfile, normalizeType } from "./utils";
import {
  calculateEquivalentDays,
  sanitizeEstimateUnit,
  sanitizeEstimateValues,
} from "./estimates";
import { clampPercentage } from "./utils";

export function normalizeDeveloperCapacity(developer: Partial<DeveloperCapacity>): DeveloperCapacity {
  return {
    id: developer.id || crypto.randomUUID(),
    name: (developer.name || "Sin nombre").trim() || "Sin nombre",
    profile: normalizeProfile(developer.profile || "Desarrollador"),
    enabled: developer.enabled ?? true,
    availabilityPercent: clampPercentage(Number(developer.availabilityPercent ?? 100)),
    licenseDays: Math.max(0, Number(developer.licenseDays ?? 0) || 0),
  };
}

export function normalizeMeeting(meeting: Partial<Meeting>): Meeting {
  return {
    id: meeting.id || crypto.randomUUID(),
    category: (meeting.category || "Reunion").trim() || "Reunion",
    summary: (meeting.summary || "Nueva reunion").trim() || "Nueva reunion",
    hours: Math.max(0, Number(meeting.hours ?? 0) || 0),
    audience: (meeting.audience || "TODOS").trim() || "TODOS",
    enabled: meeting.enabled ?? true,
  };
}

export function normalizeFilters(filters?: Partial<BacklogFilters> | null): BacklogFilters {
  return {
    search: filters?.search || "",
    typeFilter: filters?.typeFilter || "Todos",
    statusFilter: filters?.statusFilter || "Todos",
    priorityFilter: filters?.priorityFilter || "Todos",
    developerFilter: filters?.developerFilter || "Todos",
    inclusionFilter: filters?.inclusionFilter || "Todos",
  };
}

export function inferEstimateStateFromIssue(source: Partial<Issue>) {
  const type = normalizeType(source.type || "Historia");
  const manualDays = Math.max(0, Number(source.manualDays ?? 0) || 0);
  const storyPoints = Math.max(0, Number(source.storyPoints ?? 0) || 0);
  const hours = Math.max(0, Number(source.hours ?? 0) || 0);

  if (manualDays > 0) return { estimateUnit: "d" as EstimateUnit, estimateRaw: manualDays };
  if (storyPoints > 0) return { estimateUnit: "pts" as EstimateUnit, estimateRaw: storyPoints };
  if (hours > 0) return { estimateUnit: "h" as EstimateUnit, estimateRaw: hours };

  const raw = Math.max(0, Number(source.estimateRaw ?? 0) || 0);
  return { estimateUnit: sanitizeEstimateUnit(type, source.estimateUnit), estimateRaw: raw };
}

export function buildIssueWithRecalculation(issue: Issue, daysPerStoryPoint: number, hoursPerDay: number, patch: Partial<Issue>): Issue {
  const next = { ...issue, ...patch };
  const type = normalizeType(next.type);
  const baseEstimate =
    "estimateRaw" in patch || "estimateUnit" in patch || "type" in patch
      ? {
          estimateUnit: sanitizeEstimateUnit(type, next.estimateUnit),
          estimateRaw: Math.max(0, Number(next.estimateRaw ?? 0) || 0),
        }
      : inferEstimateStateFromIssue(next);
  const sanitized = sanitizeEstimateValues(type, baseEstimate.estimateUnit, baseEstimate.estimateRaw);

  return {
    ...next,
    type,
    estimateUnit: sanitized.estimateUnit,
    estimateRaw: sanitized.estimateRaw,
    storyPoints: sanitized.storyPoints,
    hours: sanitized.hours,
    manualDays: sanitized.manualDays,
    equivalentDays: calculateEquivalentDays(sanitized.storyPoints, sanitized.hours, sanitized.manualDays, daysPerStoryPoint, hoursPerDay),
    includedInSprint: next.includedInSprint ?? true,
    desired: next.desired ?? false,
    finalDeveloper: (next.finalDeveloper || SIN_DEFINIR).trim() || SIN_DEFINIR,
    key: (next.key || "").trim() || "ITEM-SIN-KEY",
    summary: (next.summary || "Sin resumen").trim() || "Sin resumen",
    status: (next.status || "Sin estado").trim() || "Sin estado",
    priority: (next.priority || "Sin prioridad").trim() || "Sin prioridad",
    jiraAssignee: (next.jiraAssignee || "Sin asignado").trim() || "Sin asignado",
    sprint: (next.sprint || "Sprint sin nombre").trim() || "Sprint sin nombre",
    createdAt: next.createdAt || "",
    updatedAt: next.updatedAt || "",
  };
}

export function normalizeIssue(source: Partial<Issue>, index: number, daysPerStoryPoint: number, hoursPerDay: number): Issue {
  const key = (source.key || `ITEM-${index + 1}`).trim() || `ITEM-${index + 1}`;
  const baseIssue: Issue = {
    id: source.id || `${key}-${index}`,
    type: normalizeType(source.type || "Historia"),
    key,
    summary: (source.summary || "Sin resumen").trim() || "Sin resumen",
    status: (source.status || "Sin estado").trim() || "Sin estado",
    estimateRaw: Math.max(0, Number(source.estimateRaw ?? 0) || 0),
    estimateUnit: sanitizeEstimateUnit(normalizeType(source.type || "Historia"), source.estimateUnit),
    storyPoints: Math.max(0, Number(source.storyPoints ?? 0) || 0),
    hours: Math.max(0, Number(source.hours ?? 0) || 0),
    manualDays: Math.max(0, Number(source.manualDays ?? 0) || 0),
    equivalentDays: 0,
    priority: (source.priority || "Sin prioridad").trim() || "Sin prioridad",
    jiraAssignee: (source.jiraAssignee || "Sin asignado").trim() || "Sin asignado",
    finalDeveloper: (source.finalDeveloper || SIN_DEFINIR).trim() || SIN_DEFINIR,
    includedInSprint: source.includedInSprint ?? true,
    desired: source.desired ?? false,
    sprint: (source.sprint || "Sprint sin nombre").trim() || "Sprint sin nombre",
    createdAt: source.createdAt || "",
    updatedAt: source.updatedAt || "",
  };

  return buildIssueWithRecalculation(baseIssue, daysPerStoryPoint, hoursPerDay, {});
}
