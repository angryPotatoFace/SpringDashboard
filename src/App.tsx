import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Alert, AlertDescription } from "./components/ui/alert";
import { Label } from "./components/ui/label";
import { Upload, CalendarRange, Users, Gauge, ClipboardList, Filter, Plus, Trash2, Download, RefreshCcw, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import * as XLSX from "xlsx";

type IssueType = "Historia" | "Tarea" | "Defecto" | "INC" | "Incidente" | "Incidencia" | "Otro";
type EstimateUnit = "pts" | "h" | "d";
type PersonProfile = "Desarrollador" | "Lider" | "QA" | "DevOps" | "Otro";
type InclusionFilter = "Todos" | "Incluidos" | "Excluidos" | "Pendientes";

type Issue = {
  id: string;
  type: IssueType;
  key: string;
  summary: string;
  status: string;
  estimateRaw: number;
  estimateUnit: EstimateUnit;
  storyPoints: number;
  hours: number;
  manualDays: number;
  equivalentDays: number;
  priority: string;
  jiraAssignee: string;
  finalDeveloper: string;
  includedInSprint: boolean;
  desired: boolean;
  sprint: string;
  createdAt: string;
  updatedAt: string;
};

type DeveloperCapacity = {
  id: string;
  name: string;
  profile: PersonProfile;
  enabled: boolean;
  availabilityPercent: number;
  licenseDays: number;
};

type Meeting = {
  id: string;
  category: string;
  summary: string;
  hours: number;
  audience: string;
  enabled: boolean;
};

type BacklogFilters = {
  search: string;
  typeFilter: string;
  statusFilter: string;
  priorityFilter: string;
  developerFilter: string;
  inclusionFilter: InclusionFilter;
};

type PersistedState = {
  developers: DeveloperCapacity[];
  sprintName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  hoursPerDay: number;
  daysPerStoryPoint: number;
  meetings: Meeting[];
  rawInput: string;
  issues: Issue[];
  filters: BacklogFilters;
  dismissedAlerts: string[];
};

type TotalMetrics = {
  totalIssues: number;
  includedIssues: number;
  excludedIssues: number;
  totalStoryPoints: number;
  totalHours: number;
  totalEquivalentDays: number;
  correctives: number;
  evolutives: number;
  assignedCount: number;
  pendingAssignmentCount: number;
  pendingAssignmentDays: number;
  totalMeetingHours: number;
  totalMeetingDaysPerDeveloper: number;
  totalMeetingDaysTeam: number;
  totalLoadDays: number;
  meetingDaysByDeveloper: Record<string, number>;
};

type CapacityDetail = DeveloperCapacity & {
  contributesToTeam: boolean;
  grossAvailableDays: number;
  meetingDays: number;
  availableDays: number;
  availableHours: number;
  assignedIssues: number;
  assignedDays: number;
  assignedIssueDays: number;
  visualAssignedIssues: number;
  visualAssignedDays: number;
  storyPoints: number;
  hours: number;
  rawOccupationPercent: number;
  occupationPercent: number;
};

type CapacitySummary = {
  detail: CapacityDetail[];
  totalGrossDays: number;
  totalAvailableDays: number;
  totalAssignedDays: number;
  rawOccupationPercent: number;
  totalOccupationPercent: number;
  balanceSpread: number;
  overloadedCount: number;
};

type SprintMetrics = {
  includedIssues: Issue[];
  assignmentIssues: Issue[];
  pendingAssignmentIssues: Issue[];
  totals: TotalMetrics;
  capacity: CapacitySummary;
};

const STORAGE_KEY = "sprint-dashboard-workspace-v5";
const SIN_DEFINIR = "Sin definir";
const DEFAULT_HOURS_PER_DAY = 8;
const DEFAULT_DAYS_PER_STORY_POINT = 0.77;
const DEFAULT_SPRINT_DAYS = 10;
const PIE_COLORS = ["#2563eb", "#7c3aed", "#dc2626", "#0f766e", "#f59e0b", "#64748b"];
const PERSON_PROFILES: PersonProfile[] = ["Desarrollador", "Lider", "QA", "DevOps", "Otro"];
const DEFAULT_DISMISSED_ALERTS: string[] = [];
const EMPTY_FILTERS: BacklogFilters = {
  search: "",
  typeFilter: "Todos",
  statusFilter: "Todos",
  priorityFilter: "Todos",
  developerFilter: "Todos",
  inclusionFilter: "Todos",
};

const developersSeed: DeveloperCapacity[] = [
  { id: crypto.randomUUID(), name: "Diego", profile: "Desarrollador", enabled: true, availabilityPercent: 100, licenseDays: 0 },
  { id: crypto.randomUUID(), name: "Jose", profile: "Desarrollador", enabled: true, availabilityPercent: 100, licenseDays: 0 },
  { id: crypto.randomUUID(), name: "Silvina", profile: "Desarrollador", enabled: true, availabilityPercent: 100, licenseDays: 0 },
  { id: crypto.randomUUID(), name: "Nuria", profile: "Desarrollador", enabled: true, availabilityPercent: 100, licenseDays: 0 },
  { id: crypto.randomUUID(), name: "Bruno", profile: "Desarrollador", enabled: true, availabilityPercent: 100, licenseDays: 0 },
];

const meetingsSeed: Meeting[] = [
  { id: crypto.randomUUID(), category: "Rutinaria", summary: "Daily", hours: 20, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Rutinaria", summary: "Metodologia", hours: 10, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Rutinaria", summary: "Refinamiento", hours: 10, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Reunion", summary: "Planning", hours: 10, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Reunion", summary: "Fin de sprint", hours: 10, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Reunion", summary: "Reparto tareas", hours: 6, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Reunion", summary: "Retro", hours: 0, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Reunion", summary: "Staff", hours: 7.5, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Reunion", summary: "Sincro", hours: 10, audience: "TODOS", enabled: true },
];

const sampleText = `INC, FMR-21311, OSS - Fuerza de Trabajo - Field Manager - Error de Funcionalidad, Post Incident Activities, 2, FMR - 26Q2 - 1B, Nuria Malet Quintar,   , Medium (P2),   , 2026-03-06, 2026-04-14, x003264
INC, FMR-21531, Field Manager - Error de Funcionalidad - error en boton reemplazo, Post Incident Activities, 4, FMR - 26Q2 - 1B, BRUNO DANIEL BONINO,   , High (P1),   , 2026-03-30, 2026-04-23, x003264
Tarea, FMR-21662, Perisistir datos al momento que recibimos OT, Finished, 8, FMR - 26Q2 - 1B, Nuria Malet Quintar,   , Low (P3),   , 2026-04-14, 2026-04-23, Romina Castro
Historia, FMR-21638, Registro de OTs Fallidas (GM) - Accion asociada a boton Buscar (BE) (Parte 2), Aceptado, 9, FMR - 26Q2 - 1B, Jose Luis Tealdi,   , Low (P3),   , 2026-04-13, 2026-04-23, Romina Castro
Defecto, FMR-21705, GM - Registro de OTs Fallidas - Los filtros de busqueda no funcionan adecuadamente, Finalizada, 1, FMR - 26Q2 - 1B, BRUNO DANIEL BONINO,   , Low (P3),   , 2026-04-17, 2026-04-23, Mariana Rodriguez`;

function clampPercentage(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function normalizeText(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeType(value: string): IssueType {
  const lower = normalizeText(value);
  if (["historia", "historia de usuario", "story", "user story"].includes(lower)) return "Historia";
  if (["tarea", "task", "subtarea", "sub-task", "sub task"].includes(lower)) return "Tarea";
  if (["defecto", "defect", "bug", "error"].includes(lower)) return "Defecto";
  if (lower === "inc") return "INC";
  if (["incidente", "incident"].includes(lower)) return "Incidente";
  if (["incidencia", "issue"].includes(lower)) return "Incidencia";
  return "Otro";
}

function normalizeProfile(value?: string | null): PersonProfile {
  const lower = normalizeText(value || "");
  if (["desarrollador", "developer", "dev"].includes(lower)) return "Desarrollador";
  if (["lider", "leader", "lead"].includes(lower)) return "Lider";
  if (["qa", "tester"].includes(lower)) return "QA";
  if (["devops", "dev ops"].includes(lower)) return "DevOps";
  return "Otro";
}

function isDeveloperProfile(profile: PersonProfile) {
  return profile === "Desarrollador";
}

function usesStoryPoints(type: IssueType) {
  return type === "Historia" || type === "Tarea";
}

function usesHours(type: IssueType) {
  return type === "Defecto" || type === "INC" || type === "Incidente" || type === "Incidencia" || type === "Otro";
}

function getDefaultEstimateUnit(type: IssueType): EstimateUnit {
  return usesStoryPoints(type) ? "pts" : "h";
}

function getAllowedEstimateUnits(type: IssueType): EstimateUnit[] {
  return usesStoryPoints(type) ? ["pts", "d"] : ["h", "d"];
}

function sanitizeEstimateUnit(type: IssueType, value?: string | null): EstimateUnit {
  const raw = (value || "").trim() as EstimateUnit;
  return getAllowedEstimateUnits(type).includes(raw) ? raw : getDefaultEstimateUnit(type);
}

function sanitizeEstimateValues(type: IssueType, estimateUnit: EstimateUnit, estimateRaw: number) {
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

function calculateEquivalentDays(storyPoints: number, hours: number, manualDays: number, daysPerStoryPoint: number, hoursPerDay: number) {
  return storyPoints * daysPerStoryPoint + hours / hoursPerDay + manualDays;
}

function roundEstimateValue(value: number) {
  return Math.round(value * 100) / 100;
}

function convertEquivalentDaysToEstimateRaw(equivalentDays: number, estimateUnit: EstimateUnit, daysPerStoryPoint: number, hoursPerDay: number) {
  if (estimateUnit === "d") return roundEstimateValue(equivalentDays);
  if (estimateUnit === "pts") return daysPerStoryPoint > 0 ? roundEstimateValue(equivalentDays / daysPerStoryPoint) : 0;
  return roundEstimateValue(equivalentDays * hoursPerDay);
}

function normalizeDeveloperCapacity(developer: Partial<DeveloperCapacity>): DeveloperCapacity {
  return {
    id: developer.id || crypto.randomUUID(),
    name: (developer.name || "Sin nombre").trim() || "Sin nombre",
    profile: normalizeProfile(developer.profile || "Desarrollador"),
    enabled: developer.enabled ?? true,
    availabilityPercent: clampPercentage(Number(developer.availabilityPercent ?? 100)),
    licenseDays: Math.max(0, Number(developer.licenseDays ?? 0) || 0),
  };
}

function normalizeMeeting(meeting: Partial<Meeting>): Meeting {
  return {
    id: meeting.id || crypto.randomUUID(),
    category: (meeting.category || "Reunion").trim() || "Reunion",
    summary: (meeting.summary || "Nueva reunion").trim() || "Nueva reunion",
    hours: Math.max(0, Number(meeting.hours ?? 0) || 0),
    audience: (meeting.audience || "TODOS").trim() || "TODOS",
    enabled: meeting.enabled ?? true,
  };
}

function inferEstimateStateFromIssue(source: Partial<Issue>) {
  const type = normalizeType(source.type || "Historia");
  const manualDays = Math.max(0, Number(source.manualDays ?? 0) || 0);
  const storyPoints = Math.max(0, Number(source.storyPoints ?? 0) || 0);
  const hours = Math.max(0, Number(source.hours ?? 0) || 0);

  if (manualDays > 0) return { estimateUnit: "d" as EstimateUnit, estimateRaw: manualDays };
  if (usesStoryPoints(type) && storyPoints > 0) return { estimateUnit: "pts" as EstimateUnit, estimateRaw: storyPoints };
  if (usesHours(type) && hours > 0) return { estimateUnit: "h" as EstimateUnit, estimateRaw: hours };

  const raw = Math.max(0, Number(source.estimateRaw ?? 0) || 0);
  return { estimateUnit: sanitizeEstimateUnit(type, source.estimateUnit), estimateRaw: raw };
}

function buildIssueWithRecalculation(issue: Issue, daysPerStoryPoint: number, hoursPerDay: number, patch: Partial<Issue>): Issue {
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

function normalizeIssue(source: Partial<Issue>, index: number, daysPerStoryPoint: number, hoursPerDay: number): Issue {
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

function normalizeFilters(filters?: Partial<BacklogFilters> | null): BacklogFilters {
  return {
    search: filters?.search || "",
    typeFilter: filters?.typeFilter || "Todos",
    statusFilter: filters?.statusFilter || "Todos",
    priorityFilter: filters?.priorityFilter || "Todos",
    developerFilter: filters?.developerFilter || "Todos",
    inclusionFilter: filters?.inclusionFilter || "Todos",
  };
}

function detectSeparator(line: string) {
  const counts = { "\t": 0, ";": 0, ",": 0 };
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }
    if (!insideQuotes && (char === "\t" || char === ";" || char === ",")) {
      counts[char] += 1;
    }
  }

  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || ",") as "\t" | ";" | ",";
}

function splitDelimitedLine(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed) return [];

  const separator = detectSeparator(trimmed);
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];

    if (char === '"') {
      if (insideQuotes && trimmed[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === separator && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value: string) {
  return normalizeText(value)
    .replace(/^"|"$/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function headerIndex(headers: string[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeader(header)));
}

function buildHeaderMap(headers: string[]) {
  const fields = {
    type: headerIndex(headers, ["Tipo", "Tipo de incidencia", "Issue Type", "Issue type", "issuetype"]),
    key: headerIndex(headers, ["Key", "Clave", "Clave de incidencia", "Issue key", "Issue Key"]),
    summary: headerIndex(headers, ["Resumen", "Summary", "Titulo", "Titulo de incidencia"]),
    status: headerIndex(headers, ["Estado", "Status"]),
    estimate: headerIndex(headers, ["Estimacion", "Estimacion original", "Story Points", "Story point estimate", "Puntos de historia", "SP", "Original Estimate"]),
    sprint: headerIndex(headers, ["Sprint", "Nombre sprint"]),
    jiraAssignee: headerIndex(headers, ["Asignado", "Persona asignada", "Assignee", "Responsable"]),
    priority: headerIndex(headers, ["Prioridad", "Priority"]),
    createdAt: headerIndex(headers, ["Creado", "Creada", "Created"]),
    updatedAt: headerIndex(headers, ["Actualizado", "Actualizada", "Updated"]),
  };

  return Object.values(fields).some((index) => index >= 0) ? fields : null;
}

function getPart(parts: string[], index: number, fallback = "") {
  return index >= 0 ? parts[index] || fallback : fallback;
}

function parseLine(line: string, index: number, daysPerStoryPoint: number, hoursPerDay: number, headers: ReturnType<typeof buildHeaderMap> = null): Issue | null {
  const parts = splitDelimitedLine(line);
  if (parts.length < 4) return null;

  const firstField = (headers ? getPart(parts, headers.type) : parts[0] || "").trim();
  const secondField = (headers ? getPart(parts, headers.key) : parts[1] || "").trim();
  const normalizedType = normalizeType(firstField || "");
  const looksLikeIssue = normalizedType !== "Otro" || /[A-Z]+-\d+/.test(secondField);
  if (!looksLikeIssue) return null;

  const type = normalizedType;
  const key = secondField || `ITEM-${index + 1}`;
  const summary = (headers ? getPart(parts, headers.summary, "Sin resumen") : parts[2] || "Sin resumen").replace(/^"|"$/g, "");
  const status = headers ? getPart(parts, headers.status, "Sin estado") : parts[3] || "Sin estado";
  const rawEstimate = String(headers ? getPart(parts, headers.estimate) : parts[4] || "").trim();
  const estimateRaw = rawEstimate ? Number(rawEstimate.replace(/,/g, ".")) || 0 : 0;
  const sprint = headers ? getPart(parts, headers.sprint, "Sprint sin nombre") : parts[5] || "Sprint sin nombre";
  const jiraAssignee = (headers ? getPart(parts, headers.jiraAssignee, "Sin asignado") : parts[6] || "Sin asignado").trim() || "Sin asignado";
  const priority = (headers ? getPart(parts, headers.priority, "Sin prioridad") : parts[8] || "Sin prioridad").trim() || "Sin prioridad";
  const createdAt = headers ? getPart(parts, headers.createdAt) : parts[10] || "";
  const updatedAt = headers ? getPart(parts, headers.updatedAt) : parts[11] || "";

  return normalizeIssue(
    {
      id: `${key}-${index}`,
      type,
      key,
      summary,
      status,
      estimateRaw,
      estimateUnit: getDefaultEstimateUnit(type),
      priority,
      jiraAssignee,
      finalDeveloper: SIN_DEFINIR,
      includedInSprint: true,
      desired: false,
      sprint,
      createdAt,
      updatedAt,
    },
    index,
    daysPerStoryPoint,
    hoursPerDay
  );
}

function parseIssues(input: string, daysPerStoryPoint: number, hoursPerDay: number): Issue[] {
  const lines = input.split(/\r?\n/).filter((line) => line.trim());
  const headerMap = lines.length > 0 ? buildHeaderMap(splitDelimitedLine(lines[0])) : null;
  const dataLines = headerMap ? lines.slice(1) : lines;

  return dataLines
    .map((line, index) => parseLine(line, index, daysPerStoryPoint, hoursPerDay, headerMap))
    .filter((issue): issue is Issue => Boolean(issue));
}

function getInitialPersistedState(): PersistedState {
  const rawInput = sampleText;
  const issues = parseIssues(rawInput, DEFAULT_DAYS_PER_STORY_POINT, DEFAULT_HOURS_PER_DAY);

  return {
    developers: developersSeed,
    sprintName: "Sprint 29-04 al 12-05",
    startDate: "2026-04-29",
    endDate: "2026-05-12",
    workingDays: DEFAULT_SPRINT_DAYS,
    hoursPerDay: DEFAULT_HOURS_PER_DAY,
    daysPerStoryPoint: DEFAULT_DAYS_PER_STORY_POINT,
    meetings: meetingsSeed,
    rawInput,
    issues,
    filters: EMPTY_FILTERS,
    dismissedAlerts: DEFAULT_DISMISSED_ALERTS,
  };
}

function hydratePersistedState(raw: unknown): PersistedState {
  const defaults = getInitialPersistedState();
  if (!raw || typeof raw !== "object") return defaults;

  const candidate = raw as Partial<PersistedState>;
  const hoursPerDay = Math.max(1, Number(candidate.hoursPerDay ?? defaults.hoursPerDay) || defaults.hoursPerDay);
  const daysPerStoryPoint = Math.max(0, Number(candidate.daysPerStoryPoint ?? defaults.daysPerStoryPoint) || defaults.daysPerStoryPoint);
  const rawInput = typeof candidate.rawInput === "string" ? candidate.rawInput : defaults.rawInput;
  const issues = Array.isArray(candidate.issues)
    ? candidate.issues.map((issue, index) => normalizeIssue(issue, index, daysPerStoryPoint, hoursPerDay))
    : parseIssues(rawInput, daysPerStoryPoint, hoursPerDay);

  return {
    developers: Array.isArray(candidate.developers) ? candidate.developers.map((developer) => normalizeDeveloperCapacity(developer)) : defaults.developers,
    sprintName: candidate.sprintName || defaults.sprintName,
    startDate: candidate.startDate || defaults.startDate,
    endDate: candidate.endDate || defaults.endDate,
    workingDays: Math.max(0, Number(candidate.workingDays ?? defaults.workingDays) || defaults.workingDays),
    hoursPerDay,
    daysPerStoryPoint,
    meetings: Array.isArray(candidate.meetings) ? candidate.meetings.map((meeting) => normalizeMeeting(meeting)) : defaults.meetings,
    rawInput,
    issues,
    filters: normalizeFilters(candidate.filters),
    dismissedAlerts: Array.isArray(candidate.dismissedAlerts) ? candidate.dismissedAlerts.filter((item): item is string => typeof item === "string") : defaults.dismissedAlerts,
  };
}

function getPersonLabel(developer: Pick<DeveloperCapacity, "name" | "profile">) {
  return `${developer.name} (${developer.profile || "Desarrollador"})`;
}

function getEstimateUnitLabel(unit: EstimateUnit) {
  if (unit === "pts") return "pts";
  if (unit === "h") return "h";
  return "dias";
}

function badgeVariant(type: IssueType) {
  switch (type) {
    case "Historia":
      return "default" as const;
    case "Tarea":
      return "secondary" as const;
    case "Defecto":
      return "destructive" as const;
    case "INC":
    case "Incidente":
    case "Incidencia":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
}

function kpiColor(occupation: number) {
  if (occupation > 100) return "text-red-600";
  if (occupation > 85) return "text-amber-600";
  return "text-emerald-600";
}

function getJiraIssueUrl(issueKey: string) {
  return `https://tecocloud.atlassian.net/browse/${issueKey.trim().toUpperCase()}`;
}

function developerCanTakeEffectiveAssignment(developer: DeveloperCapacity, workingDays: number) {
  if (!developer.enabled) return false;
  if (!isDeveloperProfile(developer.profile)) return false;
  const grossAvailableDays = Math.max(0, workingDays * (clampPercentage(developer.availabilityPercent) / 100) - Math.max(0, developer.licenseDays));
  return grossAvailableDays > 0;
}

function parseAudience(audience: string) {
  return audience
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function meetingAppliesToDeveloper(meeting: Meeting, developer: DeveloperCapacity, workingDays: number) {
  if (!meeting.enabled) return false;
  if (!developerCanTakeEffectiveAssignment(developer, workingDays)) return false;
  const normalizedAudience = normalizeText(meeting.audience);
  if (normalizedAudience === "todos") return true;
  const audienceItems = parseAudience(meeting.audience).map(normalizeText);
  return audienceItems.includes(normalizeText(developer.name));
}

function computeSprintMetrics({
  issues,
  developers,
  meetings,
  workingDays,
  hoursPerDay,
}: {
  issues: Issue[];
  developers: DeveloperCapacity[];
  meetings: Meeting[];
  workingDays: number;
  hoursPerDay: number;
}): SprintMetrics {
  const includedIssues = issues.filter((issue) => issue.includedInSprint);
  const developerByName = new Map(developers.map((developer) => [developer.name, developer]));
  const activeContributors = developers.filter((developer) => developerCanTakeEffectiveAssignment(developer, workingDays));
  const meetingDaysByDeveloper = Object.fromEntries(
    activeContributors.map((developer) => {
      const meetingHours = meetings
        .filter((meeting) => meetingAppliesToDeveloper(meeting, developer, workingDays))
        .reduce((acc, meeting) => acc + meeting.hours, 0);
      const meetingDays = hoursPerDay > 0 ? meetingHours / hoursPerDay : 0;
      return [developer.name, meetingDays];
    })
  );

  const hasEffectiveAssignment = (issue: Issue) => {
    if (!issue.includedInSprint) return false;
    if (issue.finalDeveloper === SIN_DEFINIR) return false;
    const assignedDeveloper = developerByName.get(issue.finalDeveloper);
    return assignedDeveloper ? developerCanTakeEffectiveAssignment(assignedDeveloper, workingDays) : false;
  };

  const pendingAssignmentIssues = includedIssues.filter((issue) => !hasEffectiveAssignment(issue));
  const assignmentIssues = includedIssues;
  const totalMeetingHours = meetings.filter((meeting) => meeting.enabled).reduce((acc, meeting) => acc + meeting.hours, 0);
  const totalMeetingDaysTeam = Object.values(meetingDaysByDeveloper).reduce((acc, value) => acc + value, 0);
  const totalMeetingDaysPerDeveloper = activeContributors.length > 0 ? totalMeetingDaysTeam / activeContributors.length : 0;

  const totals: TotalMetrics = {
    totalIssues: issues.length,
    includedIssues: includedIssues.length,
    excludedIssues: issues.length - includedIssues.length,
    totalStoryPoints: includedIssues.reduce((acc, issue) => acc + issue.storyPoints, 0),
    totalHours: includedIssues.reduce((acc, issue) => acc + issue.hours, 0),
    totalEquivalentDays: includedIssues.reduce((acc, issue) => acc + issue.equivalentDays, 0),
    correctives: includedIssues.filter((issue) => ["Defecto", "INC", "Incidente", "Incidencia"].includes(issue.type)).length,
    evolutives: includedIssues.filter((issue) => ["Historia", "Tarea"].includes(issue.type)).length,
    assignedCount: includedIssues.filter((issue) => hasEffectiveAssignment(issue)).length,
    pendingAssignmentCount: pendingAssignmentIssues.length,
    pendingAssignmentDays: pendingAssignmentIssues.reduce((acc, issue) => acc + issue.equivalentDays, 0),
    totalMeetingHours,
    totalMeetingDaysPerDeveloper,
    totalMeetingDaysTeam,
    totalLoadDays: includedIssues.reduce((acc, issue) => acc + issue.equivalentDays, 0) + totalMeetingDaysTeam,
    meetingDaysByDeveloper,
  };

  const detail: CapacityDetail[] = developers.map((developer) => {
    const normalizedDeveloper = normalizeDeveloperCapacity(developer);
    const contributesToTeam = isDeveloperProfile(normalizedDeveloper.profile);
    const grossAvailableDays =
      normalizedDeveloper.enabled && contributesToTeam
        ? Math.max(0, workingDays * (clampPercentage(normalizedDeveloper.availabilityPercent) / 100) - Math.max(0, normalizedDeveloper.licenseDays))
        : 0;
    const meetingDays = grossAvailableDays > 0 ? Math.min(meetingDaysByDeveloper[normalizedDeveloper.name] || 0, grossAvailableDays) : 0;
    const availableDays = Math.max(0, grossAvailableDays - meetingDays);
    const availableHours = availableDays * hoursPerDay;
    const visualAssigned = includedIssues.filter((issue) => issue.finalDeveloper === normalizedDeveloper.name);
    const effectiveAssigned = developerCanTakeEffectiveAssignment(normalizedDeveloper, workingDays) ? visualAssigned : [];
    const assignedIssueDays = effectiveAssigned.reduce((acc, issue) => acc + issue.equivalentDays, 0);
    const assignedDays = assignedIssueDays + meetingDays;
    const rawOccupationPercent = grossAvailableDays > 0 ? (assignedDays / grossAvailableDays) * 100 : 0;

    return {
      ...normalizedDeveloper,
      contributesToTeam,
      grossAvailableDays,
      meetingDays,
      availableDays,
      availableHours,
      assignedIssues: effectiveAssigned.length,
      assignedDays,
      assignedIssueDays,
      visualAssignedIssues: visualAssigned.length,
      visualAssignedDays: visualAssigned.reduce((acc, issue) => acc + issue.equivalentDays, 0),
      storyPoints: effectiveAssigned.reduce((acc, issue) => acc + issue.storyPoints, 0),
      hours: effectiveAssigned.reduce((acc, issue) => acc + issue.hours, 0),
      rawOccupationPercent,
      occupationPercent: clampPercentage(rawOccupationPercent),
    };
  });

  const enabledDetail = detail.filter((developer) => developer.enabled && developer.contributesToTeam);
  const totalGrossDays = enabledDetail.reduce((acc, item) => acc + item.grossAvailableDays, 0);
  const totalAvailableDays = enabledDetail.reduce((acc, item) => acc + item.availableDays, 0);
  const totalAssignedDays = enabledDetail.reduce((acc, item) => acc + item.assignedDays, 0);
  const rawOccupationPercent = totalGrossDays > 0 ? (totalAssignedDays / totalGrossDays) * 100 : 0;
  const capacity: CapacitySummary = {
    detail,
    totalGrossDays,
    totalAvailableDays,
    totalAssignedDays,
    rawOccupationPercent,
    totalOccupationPercent: clampPercentage(rawOccupationPercent),
    balanceSpread: enabledDetail.length > 0 ? Math.max(...enabledDetail.map((developer) => developer.assignedDays)) - Math.min(...enabledDetail.map((developer) => developer.assignedDays)) : 0,
    overloadedCount: enabledDetail.filter((developer) => developer.rawOccupationPercent > 100).length,
  };

  return {
    includedIssues,
    assignmentIssues,
    pendingAssignmentIssues,
    totals,
    capacity,
  };
}

function getAssignmentStatus(issue: Issue, developers: DeveloperCapacity[], workingDays: number) {
  if (issue.finalDeveloper === SIN_DEFINIR) {
    return { label: "Pendiente", tone: "secondary" as const };
  }

  const developer = developers.find((item) => item.name === issue.finalDeveloper);
  if (!developer) {
    return { label: "Reasignar", tone: "destructive" as const };
  }
  if (!developer.enabled) {
    return { label: "Deshabilitado", tone: "outline" as const };
  }
  if (!isDeveloperProfile(developer.profile)) {
    return { label: "Perfil no dev", tone: "outline" as const };
  }
  if (!developerCanTakeEffectiveAssignment(developer, workingDays)) {
    return { label: "Sin capacidad", tone: "outline" as const };
  }

  return { label: "Asignado", tone: "default" as const };
}

export default function SprintDashboardPrototype() {
  const initialState = useMemo(() => {
    if (typeof window === "undefined") return getInitialPersistedState();
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? hydratePersistedState(JSON.parse(stored)) : getInitialPersistedState();
    } catch {
      return getInitialPersistedState();
    }
  }, []);

  const [rawInput, setRawInput] = useState(initialState.rawInput);
  const [developers, setDevelopers] = useState<DeveloperCapacity[]>(initialState.developers.map((developer) => normalizeDeveloperCapacity(developer)));
  const [meetings, setMeetings] = useState<Meeting[]>(initialState.meetings.map((meeting) => normalizeMeeting(meeting)));
  const [sprintName, setSprintName] = useState(initialState.sprintName);
  const [startDate, setStartDate] = useState(initialState.startDate);
  const [endDate, setEndDate] = useState(initialState.endDate);
  const [workingDays, setWorkingDays] = useState(initialState.workingDays);
  const [hoursPerDay, setHoursPerDay] = useState(initialState.hoursPerDay);
  const [daysPerStoryPoint, setDaysPerStoryPoint] = useState(initialState.daysPerStoryPoint);
  const [issues, setIssues] = useState<Issue[]>(initialState.issues.map((issue, index) => normalizeIssue(issue, index, initialState.daysPerStoryPoint, initialState.hoursPerDay)));
  const [filters, setFilters] = useState<BacklogFilters>(normalizeFilters(initialState.filters));
  const [newDeveloperName, setNewDeveloperName] = useState("");
  const [newDeveloperProfile, setNewDeveloperProfile] = useState<PersonProfile>("Desarrollador");
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(initialState.dismissedAlerts || DEFAULT_DISMISSED_ALERTS);
  const [lastAddedIssueId, setLastAddedIssueId] = useState<string | null>(null);

  const normalizedDevelopers = useMemo(() => developers.map((developer) => normalizeDeveloperCapacity(developer)), [developers]);
  const normalizedMeetings = useMemo(() => meetings.map((meeting) => normalizeMeeting(meeting)), [meetings]);

  useEffect(() => {
    setIssues((current) => current.map((issue, index) => normalizeIssue(issue, index, daysPerStoryPoint, hoursPerDay)));
  }, [daysPerStoryPoint, hoursPerDay]);

  useEffect(() => {
    if (!lastAddedIssueId) return;
    const row = document.querySelector<HTMLElement>(`[data-issue-id="${lastAddedIssueId}"]`);
    if (row) {
      row.scrollIntoView({ behavior: "smooth", block: "center" });
      const input = row.querySelector("input");
      input?.focus();
    }
  }, [lastAddedIssueId, issues]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedState = {
      developers: normalizedDevelopers,
      sprintName,
      startDate,
      endDate,
      workingDays,
      hoursPerDay,
      daysPerStoryPoint,
      meetings: normalizedMeetings,
      rawInput,
      issues,
      filters,
      dismissedAlerts,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [normalizedDevelopers, sprintName, startDate, endDate, workingDays, hoursPerDay, daysPerStoryPoint, normalizedMeetings, rawInput, issues, filters, dismissedAlerts]);

  const metrics = useMemo(
    () =>
      computeSprintMetrics({
        issues,
        developers: normalizedDevelopers,
        meetings: normalizedMeetings,
        workingDays,
        hoursPerDay,
      }),
    [issues, normalizedDevelopers, normalizedMeetings, workingDays, hoursPerDay]
  );

  const { totals, capacity, includedIssues, assignmentIssues, pendingAssignmentIssues } = metrics;
  const profileByPersonName = useMemo(() => new Map(normalizedDevelopers.map((developer) => [developer.name, developer.profile])), [normalizedDevelopers]);
  const enabledPeople = useMemo(() => normalizedDevelopers.filter((developer) => developer.enabled), [normalizedDevelopers]);
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesSearch =
        issue.key.toLowerCase().includes(filters.search.toLowerCase()) ||
        issue.summary.toLowerCase().includes(filters.search.toLowerCase()) ||
        issue.jiraAssignee.toLowerCase().includes(filters.search.toLowerCase());
      const matchesType = filters.typeFilter === "Todos" || issue.type === filters.typeFilter;
      const matchesStatus = filters.statusFilter === "Todos" || issue.status === filters.statusFilter;
      const matchesPriority = filters.priorityFilter === "Todos" || issue.priority === filters.priorityFilter;
      const matchesDeveloper = filters.developerFilter === "Todos" || issue.finalDeveloper === filters.developerFilter;
      const isPending = pendingAssignmentIssues.some((pendingIssue) => pendingIssue.id === issue.id);
      const matchesInclusion =
        filters.inclusionFilter === "Todos" ||
        (filters.inclusionFilter === "Incluidos" && issue.includedInSprint) ||
        (filters.inclusionFilter === "Excluidos" && !issue.includedInSprint) ||
        (filters.inclusionFilter === "Pendientes" && isPending);

      return matchesSearch && matchesType && matchesStatus && matchesPriority && matchesDeveloper && matchesInclusion;
    });
  }, [issues, filters, pendingAssignmentIssues]);

  const uniqueStatuses = useMemo(() => Array.from(new Set(issues.map((issue) => issue.status))).sort(), [issues]);
  const uniquePriorities = useMemo(() => Array.from(new Set(issues.map((issue) => issue.priority))).sort(), [issues]);

  const typeChartData = useMemo(() => {
    const byType = new Map<string, number>();
    includedIssues.forEach((issue) => {
      byType.set(issue.type, (byType.get(issue.type) || 0) + 1);
    });
    return Array.from(byType.entries()).map(([name, value]) => ({ name, value }));
  }, [includedIssues]);

  const developerChartData = useMemo(() => {
    return capacity.detail
      .filter((developer) => developer.enabled && developer.contributesToTeam)
      .map((developer) => ({
        name: developer.name,
        carga: Number(developer.assignedDays.toFixed(2)),
        capacidad: Number(developer.availableDays.toFixed(2)),
      }));
  }, [capacity.detail]);

  const occupancyClass = kpiColor(capacity.totalOccupationPercent);

  const setFilter = <K extends keyof BacklogFilters>(key: K, value: BacklogFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const updateIssue = (id: string, patch: Partial<Issue>) => {
    setIssues((current) =>
      current.map((issue, index) => (issue.id === id ? buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, { ...patch, id: issue.id }) : normalizeIssue(issue, index, daysPerStoryPoint, hoursPerDay)))
    );
  };

  const updateIssueType = (id: string, nextTypeRaw: string) => {
    const nextType = normalizeType(nextTypeRaw);
    setIssues((current) =>
      current.map((issue) => {
        if (issue.id !== id) return issue;
        const nextUnit = getAllowedEstimateUnits(nextType).includes(issue.estimateUnit) ? issue.estimateUnit : getDefaultEstimateUnit(nextType);
        const nextEstimateRaw =
          nextUnit === issue.estimateUnit
            ? issue.estimateRaw
            : convertEquivalentDaysToEstimateRaw(issue.equivalentDays, nextUnit, daysPerStoryPoint, hoursPerDay);
        return buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, {
          type: nextType,
          estimateUnit: nextUnit,
          estimateRaw: nextEstimateRaw,
        });
      })
    );
  };

  const updateIssueEstimate = (id: string, value: number) => {
    setIssues((current) =>
      current.map((issue) => (issue.id === id ? buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, { estimateRaw: Math.max(0, value || 0) }) : issue))
    );
  };

  const updateIssueEstimateUnit = (id: string, nextUnit: string) => {
    setIssues((current) =>
      current.map((issue) => {
        if (issue.id !== id) return issue;
        const sanitizedUnit = sanitizeEstimateUnit(issue.type, nextUnit);
        const nextEstimateRaw =
          sanitizedUnit === issue.estimateUnit
            ? issue.estimateRaw
            : convertEquivalentDaysToEstimateRaw(issue.equivalentDays, sanitizedUnit, daysPerStoryPoint, hoursPerDay);
        return buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, {
          estimateUnit: sanitizedUnit,
          estimateRaw: nextEstimateRaw,
        });
      })
    );
  };

  const addManualIssue = () => {
    const nextIndex = issues.length + 1;
    const nextIssue = normalizeIssue(
      {
        id: crypto.randomUUID(),
        type: "Historia",
        key: `MANUAL-${nextIndex}`,
        summary: "Nueva historia",
        status: "Backlog",
        estimateRaw: 1,
        estimateUnit: "pts",
        priority: "Low (P3)",
        jiraAssignee: "Sin asignado",
        finalDeveloper: SIN_DEFINIR,
        includedInSprint: true,
        desired: false,
        sprint: sprintName,
        createdAt: "",
        updatedAt: "",
      },
      issues.length,
      daysPerStoryPoint,
      hoursPerDay
    );

    setIssues((current) => [...current, nextIssue]);
    setLastAddedIssueId(nextIssue.id);
  };

  const removeIssue = (id: string) => {
    setIssues((current) => current.filter((issue) => issue.id !== id));
  };

  const loadData = () => {
    setIssues(parseIssues(rawInput, daysPerStoryPoint, hoursPerDay));
    setLastAddedIssueId(null);
  };

  const resetStoredConfiguration = () => {
    const defaults = getInitialPersistedState();
    setDevelopers(defaults.developers.map((developer) => normalizeDeveloperCapacity(developer)));
    setMeetings(defaults.meetings.map((meeting) => normalizeMeeting(meeting)));
    setSprintName(defaults.sprintName);
    setStartDate(defaults.startDate);
    setEndDate(defaults.endDate);
    setWorkingDays(defaults.workingDays);
    setHoursPerDay(defaults.hoursPerDay);
    setDaysPerStoryPoint(defaults.daysPerStoryPoint);
    setRawInput(defaults.rawInput);
    setIssues(defaults.issues);
    setFilters(EMPTY_FILTERS);
    setDismissedAlerts(DEFAULT_DISMISSED_ALERTS);
    setLastAddedIssueId(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const ensureDeveloperExists = (name: string, profile: PersonProfile = "Desarrollador") => {
    const normalizedName = name.trim();
    if (!normalizedName) return null;
    const normalizedProfile = normalizeProfile(profile);
    const existingDeveloper = normalizedDevelopers.find((developer) => developer.name.toLowerCase() === normalizedName.toLowerCase());

    if (existingDeveloper) {
      if (!existingDeveloper.enabled || existingDeveloper.profile !== normalizedProfile) {
        setDevelopers((current) =>
          current.map((developer) => (developer.id === existingDeveloper.id ? { ...developer, enabled: true, profile: normalizedProfile } : developer))
        );
      }
      return existingDeveloper.name;
    }

    setDevelopers((current) => [...current, normalizeDeveloperCapacity({ name: normalizedName, profile: normalizedProfile })]);
    return normalizedName;
  };

  const addDeveloper = () => {
    const developerName = ensureDeveloperExists(newDeveloperName, newDeveloperProfile);
    if (!developerName) return;
    setNewDeveloperName("");
    setNewDeveloperProfile("Desarrollador");
  };

  const removeDeveloper = (developerName: string) => {
    setDevelopers((current) => current.filter((developer) => developer.name !== developerName));
    setIssues((current) => current.map((issue) => (issue.finalDeveloper === developerName ? { ...issue, finalDeveloper: SIN_DEFINIR } : issue)));
  };

  const updateDeveloper = (id: string, field: keyof Omit<DeveloperCapacity, "id">, value: string | number | boolean) => {
    let previousName = "";
    let nextName = "";

    setDevelopers((current) =>
      current.map((developer) => {
        if (developer.id !== id) return developer;
        if (field === "enabled") return { ...developer, enabled: Boolean(value) };
        if (field === "availabilityPercent") return { ...developer, availabilityPercent: clampPercentage(Number(value)) };
        if (field === "licenseDays") return { ...developer, licenseDays: Math.max(0, Number(value) || 0) };
        if (field === "profile") return { ...developer, profile: normalizeProfile(String(value)) };

        previousName = developer.name;
        nextName = String(value).trim();
        return { ...developer, [field]: nextName || developer.name };
      })
    );

    if (field === "name" && previousName && nextName && previousName !== nextName) {
      setIssues((current) => current.map((issue) => (issue.finalDeveloper === previousName ? { ...issue, finalDeveloper: nextName } : issue)));
    }
  };

  const updateMeeting = (id: string, patch: Partial<Meeting>) => {
    setMeetings((current) => current.map((meeting) => (meeting.id === id ? normalizeMeeting({ ...meeting, ...patch }) : meeting)));
  };

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts((current) => (current.includes(alertId) ? current : [...current, alertId]));
  };

  const getAssignmentOptions = (issue: Issue) => {
    const options = [...enabledPeople];
    if (issue.finalDeveloper !== SIN_DEFINIR) {
      const currentDeveloper = normalizedDevelopers.find((developer) => developer.name === issue.finalDeveloper);
      if (currentDeveloper && !options.some((developer) => developer.name === currentDeveloper.name)) {
        options.push(currentDeveloper);
      }
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
  };

  const exportToXlsx = () => {
    const summaryRows = [
      { metric: "Sprint", value: sprintName },
      { metric: "Fecha inicio", value: startDate },
      { metric: "Fecha fin", value: endDate },
      { metric: "Dias habiles", value: workingDays },
      { metric: "Horas por dia", value: hoursPerDay },
      { metric: "Dias por story point", value: daysPerStoryPoint },
      { metric: "Total issues", value: totals.totalIssues },
      { metric: "Incluidos", value: totals.includedIssues },
      { metric: "Excluidos", value: totals.excludedIssues },
      { metric: "Story points", value: totals.totalStoryPoints },
      { metric: "Horas correctivas", value: totals.totalHours },
      { metric: "Dias equivalentes", value: Number(totals.totalEquivalentDays.toFixed(2)) },
      { metric: "Pendientes de reparto", value: totals.pendingAssignmentCount },
      { metric: "Dias pendientes", value: Number(totals.pendingAssignmentDays.toFixed(2)) },
      { metric: "Horas reuniones", value: totals.totalMeetingHours },
      { metric: "Dias reuniones por persona", value: Number(totals.totalMeetingDaysPerDeveloper.toFixed(2)) },
      { metric: "Capacidad bruta", value: Number(capacity.totalGrossDays.toFixed(2)) },
      { metric: "Capacidad neta", value: Number(capacity.totalAvailableDays.toFixed(2)) },
      { metric: "Carga total", value: Number(totals.totalLoadDays.toFixed(2)) },
      { metric: "Ocupacion %", value: Number(capacity.totalOccupationPercent.toFixed(1)) },
      { metric: "Desbalance", value: Number(capacity.balanceSpread.toFixed(2)) },
    ];

    const backlogRows = issues.map((issue) => ({
      Tipo: issue.type,
      Key: issue.key,
      JiraUrl: getJiraIssueUrl(issue.key),
      Resumen: issue.summary,
      Estado: issue.status,
      Prioridad: issue.priority,
      IncluidoSprint: issue.includedInSprint ? "Si" : "No",
      Estimacion: issue.estimateRaw,
      Unidad: getEstimateUnitLabel(issue.estimateUnit),
      StoryPoints: issue.storyPoints,
      Horas: issue.hours,
      DiasManual: issue.manualDays,
      DiasEquivalentes: Number(issue.equivalentDays.toFixed(2)),
      AsignadoJira: issue.jiraAssignee,
      DesarrolladorFinal: issue.finalDeveloper,
      PerfilAsignado: profileByPersonName.get(issue.finalDeveloper) || "",
      SumaEsfuerzoEquipo: issue.includedInSprint ? "Si" : "No",
      Sprint: issue.sprint,
      FechaCreacion: issue.createdAt,
      FechaActualizacion: issue.updatedAt,
    }));

    const developerRows = capacity.detail.map((developer) => ({
      Persona: developer.name,
      Perfil: developer.profile,
      HabilitadoReparto: developer.enabled ? "Si" : "No",
      Disponibilidad: developer.availabilityPercent,
      Licencias: developer.licenseDays,
      DiasBrutos: Number(developer.grossAvailableDays.toFixed(2)),
      DiasReuniones: Number(developer.meetingDays.toFixed(2)),
      DiasDisponibles: Number(developer.availableDays.toFixed(2)),
      HorasDisponibles: Number(developer.availableHours.toFixed(2)),
      StoryPoints: developer.storyPoints,
      Horas: developer.hours,
      DiasAsignados: Number(developer.assignedDays.toFixed(2)),
      DiasVisuales: Number(developer.visualAssignedDays.toFixed(2)),
      IssuesAsignados: developer.assignedIssues,
      IssuesVisuales: developer.visualAssignedIssues,
      OcupacionVisible: Number(developer.occupationPercent.toFixed(1)),
      OcupacionReal: Number(developer.rawOccupationPercent.toFixed(1)),
    }));

    const meetingRows = normalizedMeetings.map((meeting) => ({
      Categoria: meeting.category,
      Resumen: meeting.summary,
      Horas: meeting.hours,
      Audiencia: meeting.audience,
      Activa: meeting.enabled ? "Si" : "No",
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Resumen");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(backlogRows), "Backlog");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(developerRows), "Desarrolladores");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(meetingRows), "Reuniones");
    XLSX.writeFile(workbook, `${sprintName.replace(/\s+/g, "_") || "sprint"}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tablero de Inicio de Sprint</h1>
              <p className="mt-1 text-sm text-slate-500">
                Carga la informacion de Jira, ajusta estimaciones, descuenta reuniones, balancea el equipo y exporta un resumen del sprint.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={resetStoredConfiguration}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset workspace
              </Button>
              <Button variant="outline" onClick={exportToXlsx}>
                <Download className="mr-2 h-4 w-4" />
                Exportar XLSX
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="h-4 w-4" />
                  Carga de backlog
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  className="min-h-[220px]"
                  placeholder="Pega aca el TXT o CSV exportado desde Jira. Soporta campos vacios, nombres completos y textos entre comillas."
                />
                <div className="flex flex-wrap gap-2">
                  <Button onClick={loadData}>Procesar backlog</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRawInput(sampleText);
                      setIssues(parseIssues(sampleText, daysPerStoryPoint, hoursPerDay));
                    }}
                  >
                    Cargar ejemplo
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarRange className="h-4 w-4" />
                  Configuracion del sprint
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Nombre sprint</Label>
                    <Input value={sprintName} onChange={(e) => setSprintName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Dias habiles</Label>
                    <Input type="number" min={0} value={workingDays} onChange={(e) => setWorkingDays(Math.max(0, Number(e.target.value) || 0))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Fecha inicio</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Fecha fin</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Horas por dia</Label>
                    <Input type="number" min={1} value={hoursPerDay} onChange={(e) => setHoursPerDay(Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Dias por story point</Label>
                    <Input type="number" min={0} step="0.01" value={daysPerStoryPoint} onChange={(e) => setDaysPerStoryPoint(Math.max(0, Number(e.target.value) || 0))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="Total de issues" value={totals.totalIssues} icon={<ClipboardList className="h-4 w-4" />} />
          <KpiCard title="Incluidos sprint" value={totals.includedIssues} icon={<ClipboardList className="h-4 w-4" />} />
          <KpiCard title="Dias equivalentes" value={totals.totalEquivalentDays.toFixed(2)} icon={<Gauge className="h-4 w-4" />} />
          <KpiCard title="Capacidad neta" value={capacity.totalAvailableDays.toFixed(2)} icon={<Users className="h-4 w-4" />} />
          <KpiCard title="Ocupacion" value={`${capacity.totalOccupationPercent.toFixed(1)}%`} valueClassName={occupancyClass} icon={<Gauge className="h-4 w-4" />} />
          <KpiCard title="Pendientes reparto" value={totals.pendingAssignmentCount} icon={<ClipboardList className="h-4 w-4" />} />
          <KpiCard title="Dias pendientes" value={totals.pendingAssignmentDays.toFixed(2)} icon={<Gauge className="h-4 w-4" />} />
          <KpiCard title="Evolutivos" value={totals.evolutives} icon={<ClipboardList className="h-4 w-4" />} />
          <KpiCard title="Correctivos" value={totals.correctives} icon={<ClipboardList className="h-4 w-4" />} />
          <KpiCard title="Horas reuniones" value={totals.totalMeetingHours} icon={<CalendarRange className="h-4 w-4" />} />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5 rounded-2xl bg-white p-1 shadow-sm">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="issues">Backlog editable</TabsTrigger>
            <TabsTrigger value="assignment">Reparto</TabsTrigger>
            <TabsTrigger value="developers">Desarrolladores</TabsTrigger>
            <TabsTrigger value="meetings">Reuniones</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Composicion del sprint por tipo</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeChartData} dataKey="value" nameKey="name" outerRadius={110} label>
                        {typeChartData.map((entry, index) => (
                          <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Capacidad vs carga por desarrollador</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={developerChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="capacidad" fill="#cbd5e1" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="carga" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Metricas de balance</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-6">
                <MetricBox title="Items incluidos" value={`${totals.includedIssues}/${totals.totalIssues}`} />
                <MetricBox title="Asignados efectivos" value={`${totals.assignedCount}/${totals.includedIssues || 0}`} />
                <MetricBox title="Pendientes" value={totals.pendingAssignmentCount} tone={totals.pendingAssignmentCount > 0 ? "danger" : "success"} />
                <MetricBox title="Reuniones por persona" value={`${totals.totalMeetingDaysPerDeveloper.toFixed(2)} dias`} />
                <MetricBox title="Personas sobrecargadas" value={capacity.overloadedCount} tone={capacity.overloadedCount > 0 ? "danger" : "success"} />
                <MetricBox title="Ajuste recomendado" value={capacity.rawOccupationPercent > 100 ? "Reducir alcance" : "Sprint balanceable"} tone={capacity.rawOccupationPercent > 100 ? "danger" : "success"} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Pendientes de asignacion</CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-[88px] flex-wrap gap-2">
                {pendingAssignmentIssues.length > 0 ? (
                  pendingAssignmentIssues.map((issue) => (
                    <Badge key={issue.id} variant="secondary">
                      {issue.key}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No hay items incluidos pendientes de reparto.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4" />
                  Backlog editable y filtros avanzados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!dismissedAlerts.includes("issues-estimate-mode") ? (
                  <DismissibleAlert onClose={() => dismissAlert("issues-estimate-mode")}>
                    La columna Estimacion usa una unica unidad visible. Historias y tareas permiten pts o dias. Correctivos permiten h o dias.
                  </DismissibleAlert>
                ) : null}
                {!dismissedAlerts.includes("issues-inclusion-rule") ? (
                  <DismissibleAlert onClose={() => dismissAlert("issues-inclusion-rule")}>
                    includedInSprint decide si el item suma al sprint. Un item incluido puede quedar sin reparto y seguir contando al total general.
                  </DismissibleAlert>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={addManualIssue}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar historia
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-6">
                  <Input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Buscar por key, resumen o asignado" />
                  <Select value={filters.typeFilter} onValueChange={(value) => setFilter("typeFilter", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="Historia">Historia</SelectItem>
                      <SelectItem value="Tarea">Tarea</SelectItem>
                      <SelectItem value="Defecto">Defecto</SelectItem>
                      <SelectItem value="INC">INC</SelectItem>
                      <SelectItem value="Incidente">Incidente</SelectItem>
                      <SelectItem value="Incidencia">Incidencia</SelectItem>
                      <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filters.statusFilter} onValueChange={(value) => setFilter("statusFilter", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      {uniqueStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.priorityFilter} onValueChange={(value) => setFilter("priorityFilter", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      {uniquePriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.developerFilter} onValueChange={(value) => setFilter("developerFilter", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Asignacion final" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value={SIN_DEFINIR}>{SIN_DEFINIR}</SelectItem>
                      {normalizedDevelopers.map((developer) => (
                        <SelectItem key={developer.id} value={developer.name}>
                          {getPersonLabel(developer)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filters.inclusionFilter} onValueChange={(value) => setFilter("inclusionFilter", value as InclusionFilter)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Inclusion" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="Incluidos">Incluidos</SelectItem>
                      <SelectItem value="Excluidos">Excluidos</SelectItem>
                      <SelectItem value="Pendientes">Pendientes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>En sprint</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Resumen</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Prioridad</TableHead>
                        <TableHead>Estimacion</TableHead>
                        <TableHead>Dias eq.</TableHead>
                        <TableHead>Asignado Jira</TableHead>
                        <TableHead>Sprint</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead>Actualizado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssues.map((issue) => (
                        <TableRow key={issue.id} data-issue-id={issue.id} className={issue.id === lastAddedIssueId ? "bg-blue-50/60" : undefined}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={issue.includedInSprint}
                              onChange={(e) => updateIssue(issue.id, { includedInSprint: e.target.checked })}
                            />
                          </TableCell>
                          <TableCell>
                            <Select value={issue.type} onValueChange={(value) => updateIssueType(issue.id, value)}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Historia">Historia</SelectItem>
                                <SelectItem value="Tarea">Tarea</SelectItem>
                                <SelectItem value="Defecto">Defecto</SelectItem>
                                <SelectItem value="INC">INC</SelectItem>
                                <SelectItem value="Incidente">Incidente</SelectItem>
                                <SelectItem value="Incidencia">Incidencia</SelectItem>
                                <SelectItem value="Otro">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex min-w-[190px] flex-col gap-1">
                              <Input value={issue.key} onChange={(e) => updateIssue(issue.id, { key: e.target.value })} className="w-44" />
                              <a
                                href={getJiraIssueUrl(issue.key)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-medium text-blue-600 underline-offset-2 hover:underline"
                              >
                                Abrir en Jira
                              </a>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[460px]">
                            <Input value={issue.summary} onChange={(e) => updateIssue(issue.id, { summary: e.target.value })} />
                          </TableCell>
                          <TableCell>
                            <Input value={issue.status} onChange={(e) => updateIssue(issue.id, { status: e.target.value })} className="w-44" />
                          </TableCell>
                          <TableCell>
                            <Input value={issue.priority} onChange={(e) => updateIssue(issue.id, { priority: e.target.value })} className="w-40" />
                          </TableCell>
                          <TableCell>
                            <div className="flex min-w-[180px] gap-2">
                              <Input
                                type="number"
                                min={0}
                                step="0.25"
                                value={issue.estimateRaw}
                                onChange={(e) => updateIssueEstimate(issue.id, Number(e.target.value))}
                                className="w-24"
                              />
                              <NativeSelect value={issue.estimateUnit} onChange={(value) => updateIssueEstimateUnit(issue.id, value)} className="w-[82px]">
                                {getAllowedEstimateUnits(issue.type).map((unit) => (
                                  <option key={unit} value={unit}>
                                    {getEstimateUnitLabel(unit)}
                                  </option>
                                ))}
                              </NativeSelect>
                            </div>
                          </TableCell>
                          <TableCell>{issue.equivalentDays.toFixed(2)}</TableCell>
                          <TableCell>
                            <Input value={issue.jiraAssignee} onChange={(e) => updateIssue(issue.id, { jiraAssignee: e.target.value })} className="w-56" />
                          </TableCell>
                          <TableCell>
                            <Input value={issue.sprint} onChange={(e) => updateIssue(issue.id, { sprint: e.target.value })} className="w-56" />
                          </TableCell>
                          <TableCell>
                            <Input value={issue.createdAt} onChange={(e) => updateIssue(issue.id, { createdAt: e.target.value })} className="w-36" />
                          </TableCell>
                          <TableCell>
                            <Input value={issue.updatedAt} onChange={(e) => updateIssue(issue.id, { updatedAt: e.target.value })} className="w-36" />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeIssue(issue.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assignment" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Reparto manual del sprint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!dismissedAlerts.includes("assignment-enabled-people") ? (
                  <DismissibleAlert onClose={() => dismissAlert("assignment-enabled-people")}>
                    El desarrollador final se asigna desde la lista de personas habilitadas para reparto.
                  </DismissibleAlert>
                ) : null}
                {!dismissedAlerts.includes("assignment-non-dev-profile") ? (
                  <DismissibleAlert onClose={() => dismissAlert("assignment-non-dev-profile")}>
                    Las asignaciones a perfiles no desarrolladores quedan visibles, pero no suman esfuerzo, reuniones ni ocupacion del equipo.
                  </DismissibleAlert>
                ) : null}
                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Resumen</TableHead>
                        <TableHead>Dias eq.</TableHead>
                        <TableHead>Asignado Jira</TableHead>
                        <TableHead>Desarrollador final</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignmentIssues.map((issue) => {
                        const assignmentStatus = getAssignmentStatus(issue, normalizedDevelopers, workingDays);
                        return (
                          <TableRow key={issue.id}>
                            <TableCell className="font-medium">
                              <a href={getJiraIssueUrl(issue.key)} target="_blank" rel="noreferrer" className="text-blue-600 underline-offset-2 hover:underline">
                                {issue.key}
                              </a>
                            </TableCell>
                            <TableCell>
                              <Badge variant={badgeVariant(issue.type)}>{issue.type}</Badge>
                            </TableCell>
                            <TableCell className="max-w-[420px] truncate">{issue.summary}</TableCell>
                            <TableCell>{issue.equivalentDays.toFixed(2)}</TableCell>
                            <TableCell>{issue.jiraAssignee}</TableCell>
                            <TableCell>
                              <NativeSelect value={issue.finalDeveloper} onChange={(value) => updateIssue(issue.id, { finalDeveloper: value })} className="w-[280px]">
                                <option value={SIN_DEFINIR}>{SIN_DEFINIR}</option>
                                {getAssignmentOptions(issue).map((developer) => (
                                  <option key={developer.id} value={developer.name}>
                                    {getPersonLabel(developer)}
                                  </option>
                                ))}
                              </NativeSelect>
                            </TableCell>
                            <TableCell>
                              {issue.finalDeveloper === SIN_DEFINIR ? (
                                <Badge variant="secondary">{SIN_DEFINIR}</Badge>
                              ) : (
                                <Badge variant={isDeveloperProfile(profileByPersonName.get(issue.finalDeveloper) || "Desarrollador") ? "default" : "outline"}>
                                  {profileByPersonName.get(issue.finalDeveloper) || "Sin perfil"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={assignmentStatus.tone}>{assignmentStatus.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="developers" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Equipo, perfiles y licencias</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input value={newDeveloperName} onChange={(e) => setNewDeveloperName(e.target.value)} placeholder="Agregar persona" />
                  <Select value={newDeveloperProfile} onValueChange={(value) => setNewDeveloperProfile(normalizeProfile(value))}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERSON_PROFILES.map((profile) => (
                        <SelectItem key={profile} value={profile}>
                          {profile}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addDeveloper}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Persona</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Habilitado reparto</TableHead>
                        <TableHead>Disponibilidad %</TableHead>
                        <TableHead>Licencias</TableHead>
                        <TableHead>Dias brutos</TableHead>
                        <TableHead>Dias reuniones</TableHead>
                        <TableHead>Dias disp.</TableHead>
                        <TableHead>Horas disp.</TableHead>
                        <TableHead>Points asignados</TableHead>
                        <TableHead>Horas asignadas</TableHead>
                        <TableHead>Dias asignados</TableHead>
                        <TableHead>Dias visuales</TableHead>
                        <TableHead>Ocupacion</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {capacity.detail.map((developer) => (
                        <TableRow key={developer.id}>
                          <TableCell>
                            <Input value={developer.name} onChange={(e) => updateDeveloper(developer.id, "name", e.target.value)} className="w-44" />
                          </TableCell>
                          <TableCell>
                            <NativeSelect value={developer.profile} onChange={(value) => updateDeveloper(developer.id, "profile", value)} className="w-[160px]">
                              {PERSON_PROFILES.map((profile) => (
                                <option key={profile} value={profile}>
                                  {profile}
                                </option>
                              ))}
                            </NativeSelect>
                          </TableCell>
                          <TableCell>
                            <input type="checkbox" checked={developer.enabled} onChange={(e) => updateDeveloper(developer.id, "enabled", e.target.checked)} />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={developer.availabilityPercent}
                              onChange={(e) => updateDeveloper(developer.id, "availabilityPercent", Number(e.target.value))}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} value={developer.licenseDays} onChange={(e) => updateDeveloper(developer.id, "licenseDays", Number(e.target.value))} className="w-24" />
                          </TableCell>
                          <TableCell>{developer.grossAvailableDays.toFixed(2)}</TableCell>
                          <TableCell>{developer.meetingDays.toFixed(2)}</TableCell>
                          <TableCell>{developer.availableDays.toFixed(2)}</TableCell>
                          <TableCell>{developer.availableHours.toFixed(2)}</TableCell>
                          <TableCell>{developer.storyPoints}</TableCell>
                          <TableCell>{developer.hours}</TableCell>
                          <TableCell>{developer.assignedDays.toFixed(2)}</TableCell>
                          <TableCell>{developer.visualAssignedDays.toFixed(2)}</TableCell>
                          <TableCell className={kpiColor(developer.occupationPercent)}>{developer.occupationPercent.toFixed(1)}%</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => removeDeveloper(developer.name)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="meetings" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Reuniones y carga transversal del sprint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setMeetings((current) => [
                        ...current,
                        normalizeMeeting({
                          id: crypto.randomUUID(),
                          category: "Reunion",
                          summary: "Nueva reunion",
                          hours: 1,
                          audience: "TODOS",
                          enabled: true,
                        }),
                      ])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar reunion
                  </Button>
                </div>
                {!dismissedAlerts.includes("meetings-team-load") ? (
                  <DismissibleAlert onClose={() => dismissAlert("meetings-team-load")}>
                    Las reuniones activas descuentan capacidad a cada desarrollador disponible segun su audiencia y carga transversal del sprint.
                  </DismissibleAlert>
                ) : null}
                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Activa</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Resumen</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Audiencia</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {normalizedMeetings.map((meeting) => (
                        <TableRow key={meeting.id}>
                          <TableCell>
                            <input type="checkbox" checked={meeting.enabled} onChange={(e) => updateMeeting(meeting.id, { enabled: e.target.checked })} />
                          </TableCell>
                          <TableCell>
                            <Input value={meeting.category} onChange={(e) => updateMeeting(meeting.id, { category: e.target.value })} className="w-32" />
                          </TableCell>
                          <TableCell>
                            <Input value={meeting.summary} onChange={(e) => updateMeeting(meeting.id, { summary: e.target.value })} className="min-w-[220px]" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="0.5" value={meeting.hours} onChange={(e) => updateMeeting(meeting.id, { hours: Math.max(0, Number(e.target.value) || 0) })} className="w-24" />
                          </TableCell>
                          <TableCell>
                            <Input value={meeting.audience} onChange={(e) => updateMeeting(meeting.id, { audience: e.target.value })} className="w-40" />
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => setMeetings((current) => current.filter((item) => item.id !== meeting.id))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function KpiCard({
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

function DismissibleAlert({
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

function NativeSelect({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={[
        "h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </select>
  );
}

function MetricBox({ title, value, tone = "default" }: { title: string; value: React.ReactNode; tone?: "default" | "success" | "danger" }) {
  const toneClass =
    tone === "danger"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
