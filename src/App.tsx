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
import { Upload, CalendarRange, Users, Gauge, ClipboardList, Filter, Plus, Trash2, Download, RefreshCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import * as XLSX from "xlsx";

type IssueType = "Historia" | "Tarea" | "Defecto" | "INC" | "Incidente" | "Incidencia" | "Otro";

type Issue = {
  id: string;
  type: IssueType;
  key: string;
  summary: string;
  status: string;
  estimateRaw?: number;
  storyPoints: number;
  hours: number;
  manualDays: number;
  equivalentDays: number;
  priority: string;
  jiraAssignee: string;
  finalDeveloper: string;
  desired: boolean;
  sprint: string;
  createdAt: string;
  updatedAt: string;
};

type PersonProfile = "Desarrollador" | "Lider" | "QA" | "DevOps" | "Otro";

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

type PersistedState = {
  developers: DeveloperCapacity[];
  sprintName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  hoursPerDay: number;
  daysPerStoryPoint: number;
  meetings: Meeting[];
};

const STORAGE_KEY = "sprint-dashboard-config-v4";

const DEFAULT_HOURS_PER_DAY = 8;
const DEFAULT_DAYS_PER_STORY_POINT = 0.77;
const DEFAULT_SPRINT_DAYS = 10;
const PIE_COLORS = ["#2563eb", "#7c3aed", "#dc2626", "#0f766e", "#f59e0b", "#64748b"];

const PERSON_PROFILES: PersonProfile[] = ["Desarrollador", "Lider", "QA", "DevOps", "Otro"];

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
  { id: crypto.randomUUID(), category: "Reunion", summary: "Planing", hours: 10, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Reunion", summary: "Fin de sprint", hours: 10, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Reunion", summary: "Reparto tareas", hours: 6, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Reunion", summary: "Retro", hours: 0, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Reunion", summary: "Staff", hours: 7.5, audience: "TODOS", enabled: true },
  { id: crypto.randomUUID(), category: "Reunion", summary: "Sincro", hours: 10, audience: "TODOS", enabled: true },
];

const sampleText = `INC, FMR-21311, OSS - Fuerza de Trabajo - Field Manager - Error de Funcionalidad, Post Incident Activities, 2, FMR - 26Q2 - 1B, Nuria Malet Quintar,   , Medium (P2),   , 2026-03-06, 2026-04-14, x003264
INC, FMR-21531, Field Manager - Error de Funcionalidad - error en boton reemplazo, Post Incident Activities, 4, FMR - 26Q2 - 1B, BRUNO DANIEL BONINO,   , High (P1),   , 2026-03-30, 2026-04-23, x003264
Tarea, FMR-21662, Perisistir datos  al momento que recibimos OT, Finished, 8, FMR - 26Q2 - 1B, Nuria Malet Quintar,   , Low (P3),   , 2026-04-14, 2026-04-23, Romina Castro
Historia, FMR-21638, Registro de OTs Fallidas (GM) - Accion asociada a botón Buscar (BE) (Parte 2), Aceptado, 9, FMR - 26Q2 - 1B, Jose Luis Tealdi,   , Low (P3),   , 2026-04-13, 2026-04-23, Romina Castro
Defecto, FMR-21705, GM - Registro de OTs Fallidas - Los filtros de búsqueda no funcionan adecuadamente, Finalizada, 1, FMR - 26Q2 - 1B, BRUNO DANIEL BONINO,   , Low (P3),   , 2026-04-17, 2026-04-23, Mariana Rodriguez`;

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
  if (lower === "desarrollador" || lower === "developer" || lower === "dev") return "Desarrollador";
  if (lower === "lider" || lower === "leader" || lower === "lead") return "Lider";
  if (lower === "qa" || lower === "tester") return "QA";
  if (lower === "devops" || lower === "dev ops") return "DevOps";
  return "Otro";
}

function isDeveloperProfile(profile: PersonProfile) {
  return profile === "Desarrollador";
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

function getPersonLabel(developer: Pick<DeveloperCapacity, "name" | "profile">) {
  return `${developer.name} (${developer.profile || "Desarrollador"})`;
}

function getStoryPoints(type: IssueType, raw: number): number {
  return type === "Historia" || type === "Tarea" ? raw : 0;
}

function getHours(type: IssueType, raw: number): number {
  return type === "Defecto" || type === "INC" || type === "Incidente" || type === "Incidencia" ? raw : 0;
}

function usesStoryPoints(type: IssueType) {
  return type === "Historia" || type === "Tarea";
}

function usesHours(type: IssueType) {
  return type === "Defecto" || type === "INC" || type === "Incidente" || type === "Incidencia" || type === "Otro";
}

function calculateEquivalentDays(storyPoints: number, hours: number, manualDays: number, daysPerStoryPoint: number, hoursPerDay: number) {
  return storyPoints * daysPerStoryPoint + hours / hoursPerDay + manualDays;
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
    estimate: headerIndex(headers, ["Estimacion", "Estimacion original", "Story Points", "Story point estimate", "Puntos de historia", "SP"]),
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
  const key = secondField || "ITEM-" + String(index + 1);
  const summary = (headers ? getPart(parts, headers.summary, "Sin resumen") : parts[2] || "Sin resumen").replace(/^"|"$/g, "");
  const status = headers ? getPart(parts, headers.status, "Sin estado") : parts[3] || "Sin estado";
  const rawEstimate = String(headers ? getPart(parts, headers.estimate) : parts[4] || "").trim();
  const estimateRaw = rawEstimate ? Number(rawEstimate.replace(/,/g, ".")) || 0 : 0;
  const sprint = headers ? getPart(parts, headers.sprint, "Sprint sin nombre") : parts[5] || "Sprint sin nombre";
  const jiraAssignee = (headers ? getPart(parts, headers.jiraAssignee, "Sin asignado") : parts[6] || "Sin asignado").trim() || "Sin asignado";
  const priority = (headers ? getPart(parts, headers.priority, "Sin prioridad") : parts[8] || "Sin prioridad").trim() || "Sin prioridad";
  const createdAt = headers ? getPart(parts, headers.createdAt) : parts[10] || "";
  const updatedAt = headers ? getPart(parts, headers.updatedAt) : parts[11] || "";
  const storyPoints = getStoryPoints(type, estimateRaw);
  const hours = getHours(type, estimateRaw);
  const manualDays = 0;

  return {
    id: key + "-" + String(index),
    type,
    key,
    summary,
    status,
    estimateRaw,
    storyPoints,
    hours,
    manualDays,
    equivalentDays: calculateEquivalentDays(storyPoints, hours, manualDays, daysPerStoryPoint, hoursPerDay),
    priority,
    jiraAssignee,
    finalDeveloper: "Sin definir",
    desired: false,
    sprint,
    createdAt,
    updatedAt,
  };
}

function parseIssues(input: string, daysPerStoryPoint: number, hoursPerDay: number): Issue[] {
  const lines = input.split(/\r?\n/).filter((line) => line.trim());
  const headerMap = lines.length > 0 ? buildHeaderMap(splitDelimitedLine(lines[0])) : null;
  const dataLines = headerMap ? lines.slice(1) : lines;

  return dataLines
    .map((line, index) => parseLine(line, index, daysPerStoryPoint, hoursPerDay, headerMap))
    .filter((issue): issue is Issue => Boolean(issue));
}

function kpiColor(occupation: number) {
  if (occupation > 100) return "text-red-600";
  if (occupation > 85) return "text-amber-600";
  return "text-emerald-600";
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

function buildIssueWithRecalculation(issue: Issue, daysPerStoryPoint: number, hoursPerDay: number, patch: Partial<Issue>): Issue {
  const next = { ...issue, ...patch };
  return {
    ...next,
    equivalentDays: calculateEquivalentDays(next.storyPoints, next.hours, next.manualDays, daysPerStoryPoint, hoursPerDay),
  };
}

function getJiraIssueUrl(issueKey: string) {
  return `https://tecocloud.atlassian.net/browse/${issueKey.trim().toUpperCase()}`;
}

function getInitialPersistedState(): PersistedState {
  return {
    developers: developersSeed,
    sprintName: "Sprint 29-04 al 12-05",
    startDate: "2026-04-29",
    endDate: "2026-05-12",
    workingDays: DEFAULT_SPRINT_DAYS,
    hoursPerDay: DEFAULT_HOURS_PER_DAY,
    daysPerStoryPoint: DEFAULT_DAYS_PER_STORY_POINT,
    meetings: meetingsSeed,
  };
}

export default function SprintDashboardPrototype() {
  const initialState = useMemo(() => {
    if (typeof window === "undefined") return getInitialPersistedState();
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      return stored ? { ...getInitialPersistedState(), ...JSON.parse(stored) } : getInitialPersistedState();
    } catch {
      return getInitialPersistedState();
    }
  }, []);

  const [rawInput, setRawInput] = useState(sampleText);
  const [developers, setDevelopers] = useState<DeveloperCapacity[]>(
    initialState.developers.map((developer: DeveloperCapacity) => normalizeDeveloperCapacity(developer))
  );
  const [meetings, setMeetings] = useState<Meeting[]>(initialState.meetings);
  const [sprintName, setSprintName] = useState(initialState.sprintName);
  const [startDate, setStartDate] = useState(initialState.startDate);
  const [endDate, setEndDate] = useState(initialState.endDate);
  const [workingDays, setWorkingDays] = useState(initialState.workingDays);
  const [hoursPerDay, setHoursPerDay] = useState(initialState.hoursPerDay);
  const [daysPerStoryPoint, setDaysPerStoryPoint] = useState(initialState.daysPerStoryPoint);
  const [issues, setIssues] = useState<Issue[]>(() => parseIssues(sampleText, initialState.daysPerStoryPoint, initialState.hoursPerDay));
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [priorityFilter, setPriorityFilter] = useState("Todos");
  const [developerFilter, setDeveloperFilter] = useState("Todos");
  const [newDeveloperName, setNewDeveloperName] = useState("");
  const [newDeveloperProfile, setNewDeveloperProfile] = useState<PersonProfile>("Desarrollador");

  const normalizedDevelopers = useMemo(
    () => developers.map((developer) => normalizeDeveloperCapacity(developer)),
    [developers]
  );

  const addManualIssue = () => {
    const nextIndex = issues.length + 1;
    const key = `MANUAL-${nextIndex}`;
    const type: IssueType = "Historia";
    const storyPoints = 1;
    const hours = 0;
    const manualDays = 0;

    setIssues((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        type,
        key,
        summary: "Nueva historia",
        status: "Backlog",
        estimateRaw: storyPoints,
        storyPoints,
        hours,
        manualDays,
        equivalentDays: calculateEquivalentDays(storyPoints, hours, manualDays, daysPerStoryPoint, hoursPerDay),
        priority: "Low (P3)",
        jiraAssignee: "Sin asignado",
        finalDeveloper: "Sin definir",
        desired: false,
        sprint: sprintName,
        createdAt: "",
        updatedAt: "",
      },
    ]);
  };

  const updateIssueType = (id: string, nextTypeRaw: string) => {
    const nextType = normalizeType(nextTypeRaw);
    setIssues((current) =>
      current.map((issue) => {
        if (issue.id !== id) return issue;

        const nextStoryPoints = usesStoryPoints(nextType) ? issue.storyPoints || 1 : 0;
        const nextHours = usesHours(nextType) ? issue.hours || 1 : 0;

        return buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, {
          type: nextType,
          storyPoints: nextStoryPoints,
          hours: nextHours,
          estimateRaw: nextType === "Historia" || nextType === "Tarea" ? nextStoryPoints : nextHours,
        });
      })
    );
  };

  const removeIssue = (id: string) => {
    setIssues((current) => current.filter((issue) => issue.id !== id));
  };

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
      meetings,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [normalizedDevelopers, meetings, sprintName, startDate, endDate, workingDays, hoursPerDay, daysPerStoryPoint]);

  const loadData = () => {
    setIssues(parseIssues(rawInput, daysPerStoryPoint, hoursPerDay));
  };

  const resetStoredConfiguration = () => {
    const defaults = getInitialPersistedState();
    setDevelopers(defaults.developers.map((developer) => normalizeDeveloperCapacity(developer)));
    setMeetings(defaults.meetings);
    setSprintName(defaults.sprintName);
    setStartDate(defaults.startDate);
    setEndDate(defaults.endDate);
    setWorkingDays(defaults.workingDays);
    setHoursPerDay(defaults.hoursPerDay);
    setDaysPerStoryPoint(defaults.daysPerStoryPoint);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const updateIssue = (id: string, patch: Partial<Issue>) => {
    setIssues((current) => current.map((issue) => (issue.id === id ? buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, patch) : issue)));
  };

  const updateIssueEstimate = (id: string, value: number) => {
    setIssues((current) =>
      current.map((issue) => {
        if (issue.id !== id) return issue;
        const normalizedValue = Math.max(0, value || 0);

        if (issue.type === "Historia" || issue.type === "Tarea") {
          return buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, {
            estimateRaw: normalizedValue,
            storyPoints: normalizedValue,
          });
        }

        return buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, {
          estimateRaw: normalizedValue,
          hours: normalizedValue,
        });
      })
    );
  };

  const issuesWithRecalculation = useMemo(
    () => issues.map((issue) => buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, {})),
    [issues, daysPerStoryPoint, hoursPerDay]
  );

  const filteredIssues = useMemo(() => {
    return issuesWithRecalculation.filter((issue) => {
      const matchesSearch =
        issue.key.toLowerCase().includes(search.toLowerCase()) ||
        issue.summary.toLowerCase().includes(search.toLowerCase()) ||
        issue.jiraAssignee.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "Todos" || issue.type === typeFilter;
      const matchesStatus = statusFilter === "Todos" || issue.status === statusFilter;
      const matchesPriority = priorityFilter === "Todos" || issue.priority === priorityFilter;
      const matchesDeveloper = developerFilter === "Todos" || issue.finalDeveloper === developerFilter;
      return matchesSearch && matchesType && matchesStatus && matchesPriority && matchesDeveloper;
    });
  }, [issuesWithRecalculation, search, typeFilter, statusFilter, priorityFilter, developerFilter]);

  const enabledPeople = useMemo(
    () => normalizedDevelopers.filter((developer) => developer.enabled),
    [normalizedDevelopers]
  );

  const enabledDevelopers = useMemo(
    () => enabledPeople.filter((developer) => isDeveloperProfile(developer.profile)),
    [enabledPeople]
  );

  const profileByPersonName = useMemo(
    () => new Map(normalizedDevelopers.map((developer) => [developer.name, developer.profile])),
    [normalizedDevelopers]
  );

  const teamEffortIssues = useMemo(
    () => issuesWithRecalculation.filter((issue) => isDeveloperProfile(profileByPersonName.get(issue.finalDeveloper) || "Desarrollador")),
    [issuesWithRecalculation, profileByPersonName]
  );

  const totals = useMemo(() => {
    const totalIssues = issuesWithRecalculation.length;
    const totalStoryPoints = teamEffortIssues.reduce((acc, issue) => acc + issue.storyPoints, 0);
    const totalHours = teamEffortIssues.reduce((acc, issue) => acc + issue.hours, 0);
    const totalEquivalentDays = teamEffortIssues.reduce((acc, issue) => acc + issue.equivalentDays, 0);
    const correctives = teamEffortIssues.filter((i) => i.type === "Defecto" || i.type === "INC" || i.type === "Incidente" || i.type === "Incidencia").length;
    const evolutives = teamEffortIssues.filter((i) => i.type === "Historia" || i.type === "Tarea").length;
    const desiredCount = issuesWithRecalculation.filter((i) => i.desired).length;
    const assignedCount = issuesWithRecalculation.filter((i) => i.finalDeveloper !== "Sin definir").length;
    const unassignedCount = totalIssues - assignedCount;
    const enabledMeetings = meetings.filter((meeting) => meeting.enabled);
    const activeDevelopers = enabledDevelopers.filter((developer) => clampPercentage(developer.availabilityPercent) > 0 && Math.max(0, developer.licenseDays) < workingDays);
    const totalMeetingHours = enabledMeetings.reduce((acc, meeting) => acc + meeting.hours, 0);
    const totalMeetingDaysPerDeveloper = hoursPerDay > 0 ? totalMeetingHours / hoursPerDay : 0;
    const totalMeetingDaysTeam = totalMeetingDaysPerDeveloper * activeDevelopers.length;
    const totalLoadDays = totalEquivalentDays + totalMeetingDaysTeam;
    return {
      totalIssues,
      totalStoryPoints,
      totalHours,
      totalEquivalentDays,
      correctives,
      evolutives,
      desiredCount,
      assignedCount,
      unassignedCount,
      totalMeetingHours,
      totalMeetingDaysPerDeveloper,
      totalMeetingDaysTeam,
      totalLoadDays,
    };
  }, [issuesWithRecalculation, teamEffortIssues, meetings, enabledDevelopers, workingDays, hoursPerDay]);

  const capacity = useMemo(() => {
    const meetingDaysPerDeveloper = totals.totalMeetingDaysPerDeveloper;

    const detail = normalizedDevelopers.map((developer) => {
      const contributesToTeam = isDeveloperProfile(developer.profile);
      const visualAssignedIssues = issuesWithRecalculation.filter((issue) => issue.finalDeveloper === developer.name);
      const visualAssignedDays = visualAssignedIssues.reduce((acc, issue) => acc + issue.equivalentDays, 0);

      if (!developer.enabled || !contributesToTeam) {
        return {
          ...developer,
          profile: normalizeProfile(developer.profile),
          contributesToTeam,
          availabilityPercent: clampPercentage(developer.availabilityPercent),
          licenseDays: Math.max(0, developer.licenseDays),
          grossAvailableDays: 0,
          meetingDays: 0,
          availableDays: 0,
          availableHours: 0,
          assignedIssues: 0,
          assignedDays: 0,
          assignedIssueDays: 0,
          visualAssignedIssues: visualAssignedIssues.length,
          visualAssignedDays,
          storyPoints: 0,
          hours: 0,
          occupationPercent: 0,
        };
      }

      const normalizedAvailability = clampPercentage(developer.availabilityPercent);
      const normalizedLicenseDays = Math.max(0, developer.licenseDays);
      const grossAvailableDays = Math.max(0, workingDays * (normalizedAvailability / 100) - normalizedLicenseDays);
      const effectiveMeetingDays = grossAvailableDays > 0 ? Math.min(meetingDaysPerDeveloper, grossAvailableDays) : 0;
      const availableDays = Math.max(0, grossAvailableDays - effectiveMeetingDays);
      const availableHours = availableDays * hoursPerDay;
      const assignedIssues = visualAssignedIssues;
      const assignedIssueDays = assignedIssues.reduce((acc, issue) => acc + issue.equivalentDays, 0);
      const assignedDays = assignedIssueDays + effectiveMeetingDays;
      const occupationPercent = grossAvailableDays > 0 ? (assignedDays / grossAvailableDays) * 100 : 0;
      return {
        ...developer,
        profile: normalizeProfile(developer.profile),
        contributesToTeam,
        availabilityPercent: normalizedAvailability,
        licenseDays: normalizedLicenseDays,
        grossAvailableDays,
        meetingDays: effectiveMeetingDays,
        availableDays,
        availableHours,
        assignedIssues: assignedIssues.length,
        assignedDays,
        assignedIssueDays,
        visualAssignedIssues: visualAssignedIssues.length,
        visualAssignedDays,
        storyPoints: assignedIssues.reduce((acc, issue) => acc + issue.storyPoints, 0),
        hours: assignedIssues.reduce((acc, issue) => acc + issue.hours, 0),
        occupationPercent,
      };
    });

    const enabledDetail = detail.filter((developer) => developer.enabled && developer.contributesToTeam);
    const totalGrossDays = enabledDetail.reduce((acc, item) => acc + item.grossAvailableDays, 0);
    const totalAvailableDays = enabledDetail.reduce((acc, item) => acc + item.availableDays, 0);
    const totalAssignedDays = enabledDetail.reduce((acc, item) => acc + item.assignedDays, 0);
    const totalOccupationPercent = totalGrossDays > 0 ? (totalAssignedDays / totalGrossDays) * 100 : 0;
    const balanceSpread = enabledDetail.length > 0 ? Math.max(...enabledDetail.map((d) => d.assignedDays)) - Math.min(...enabledDetail.map((d) => d.assignedDays)) : 0;
    const overloadedCount = enabledDetail.filter((d) => d.occupationPercent > 100).length;

    return { detail, totalGrossDays, totalAvailableDays, totalAssignedDays, totalOccupationPercent, balanceSpread, overloadedCount };
  }, [normalizedDevelopers, issuesWithRecalculation, totals.totalMeetingDaysPerDeveloper, workingDays, hoursPerDay]);

  const typeChartData = useMemo(() => {
    const byType = new Map<string, number>();
    issuesWithRecalculation.forEach((issue) => {
      byType.set(issue.type, (byType.get(issue.type) || 0) + 1);
    });
    return Array.from(byType.entries()).map(([name, value]) => ({ name, value }));
  }, [issuesWithRecalculation]);

  const developerChartData = useMemo(() => {
    return capacity.detail
      .filter((dev) => dev.enabled && dev.contributesToTeam)
      .map((dev) => ({
      name: dev.name,
      carga: Number(dev.assignedDays.toFixed(2)),
      capacidad: Number(dev.availableDays.toFixed(2)),
      }));
  }, [capacity.detail]);

  const uniqueStatuses = useMemo(() => Array.from(new Set(issuesWithRecalculation.map((issue) => issue.status))).sort(), [issuesWithRecalculation]);
  const uniquePriorities = useMemo(() => Array.from(new Set(issuesWithRecalculation.map((issue) => issue.priority))).sort(), [issuesWithRecalculation]);

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
    setIssues((current) => current.map((issue) => (issue.finalDeveloper === developerName ? { ...issue, finalDeveloper: "Sin definir" } : issue)));
  };

  const updateDeveloper = (id: string, field: keyof Omit<DeveloperCapacity, "id">, value: string | number | boolean) => {
    let previousName = "";
    let nextName = "";
    let disabledDeveloperName = "";

    setDevelopers((current) =>
      current.map((developer) => {
        if (developer.id !== id) return developer;
        if (field === "enabled") {
          const nextEnabled = Boolean(value);
          if (!nextEnabled) {
            disabledDeveloperName = developer.name;
          }
          return { ...developer, enabled: nextEnabled };
        }
        if (field === "availabilityPercent") {
          return { ...developer, availabilityPercent: clampPercentage(Number(value)) };
        }
        if (field === "licenseDays") {
          return { ...developer, licenseDays: Math.max(0, Number(value) || 0) };
        }
        if (field === "profile") {
          return { ...developer, profile: normalizeProfile(String(value)) };
        }

        previousName = developer.name;
        nextName = String(value).trim();
        return { ...developer, [field]: nextName || developer.name };
      })
    );

    if (field === "name" && previousName && nextName && previousName !== nextName) {
      setIssues((current) =>
        current.map((issue) => (issue.finalDeveloper === previousName ? { ...issue, finalDeveloper: nextName } : issue))
      );
    }

    if (field === "enabled" && disabledDeveloperName) {
      setIssues((current) =>
        current.map((issue) => (issue.finalDeveloper === disabledDeveloperName ? { ...issue, finalDeveloper: "Sin definir" } : issue))
      );
    }
  };

  const updateMeeting = (id: string, patch: Partial<Meeting>) => {
    setMeetings((current) => current.map((meeting) => (meeting.id === id ? { ...meeting, ...patch } : meeting)));
  };

  const exportToXlsx = () => {
    const summaryRows = [
      { metric: "Sprint", value: sprintName },
      { metric: "Fecha inicio", value: startDate },
      { metric: "Fecha fin", value: endDate },
      { metric: "Días hábiles", value: workingDays },
      { metric: "Horas por día", value: hoursPerDay },
      { metric: "Días por story point", value: daysPerStoryPoint },
      { metric: "Total issues", value: totals.totalIssues },
      { metric: "Story points", value: totals.totalStoryPoints },
      { metric: "Historias deseadas", value: totals.desiredCount },
      { metric: "Horas correctivas", value: totals.totalHours },
      { metric: "Días equivalentes", value: Number(totals.totalEquivalentDays.toFixed(2)) },
      { metric: "Horas reuniones", value: totals.totalMeetingHours },
      { metric: "Días reuniones por persona", value: Number(totals.totalMeetingDaysPerDeveloper.toFixed(2)) },
      { metric: "Capacidad bruta", value: Number(capacity.totalGrossDays.toFixed(2)) },
      { metric: "Capacidad neta", value: Number(capacity.totalAvailableDays.toFixed(2)) },
      { metric: "Carga total", value: Number(totals.totalLoadDays.toFixed(2)) },
      { metric: "Ocupación %", value: Number(capacity.totalOccupationPercent.toFixed(1)) },
      { metric: "Desbalance", value: Number(capacity.balanceSpread.toFixed(2)) },
    ];

    const backlogRows = issuesWithRecalculation.map((issue) => ({
      Tipo: issue.type,
      Key: issue.key,
      JiraUrl: getJiraIssueUrl(issue.key),
      Resumen: issue.summary,
      Estado: issue.status,
      Prioridad: issue.priority,
      Deseada: issue.desired ? "Si" : "No",
      Points: issue.storyPoints,
      Horas: issue.hours,
      DiasManual: issue.manualDays,
      DiasEquivalentes: Number(issue.equivalentDays.toFixed(2)),
      AsignadoJira: issue.jiraAssignee,
      DesarrolladorFinal: issue.finalDeveloper,
      PerfilAsignado: profileByPersonName.get(issue.finalDeveloper) || "",
      SumaEsfuerzoEquipo: isDeveloperProfile(profileByPersonName.get(issue.finalDeveloper) || "Desarrollador") ? "Si" : "No",
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
      Ocupacion: Number(developer.occupationPercent.toFixed(1)),
    }));

    const meetingRows = meetings.map((meeting) => ({
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

  const occupancyClass = kpiColor(capacity.totalOccupationPercent);
  const desiredIssues = issuesWithRecalculation.filter((issue) => issue.desired);

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Tablero de Inicio de Sprint</h1>
              <p className="mt-1 text-sm text-slate-500">
                Cargá la información de Jira, ajustá estimaciones, descontá reuniones, balanceá el equipo y exportá un resumen del sprint.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={resetStoredConfiguration}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reset config
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
                  placeholder="Pegá acá el TXT o CSV exportado desde Jira. Soporta campos vacíos, nombres completos y textos entre comillas."
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
                  Configuración conectada a la lógica del Excel
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Nombre sprint</Label>
                    <Input value={sprintName} onChange={(e) => setSprintName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>Días hábiles</Label>
                    <Input type="number" value={workingDays} onChange={(e) => setWorkingDays(Math.max(0, Number(e.target.value) || 0))} />
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
                    <Label>Horas por día</Label>
                    <Input type="number" min={1} value={hoursPerDay} onChange={(e) => setHoursPerDay(Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                  <div className="space-y-1">
                    <Label>Días por story point</Label>
                    <Input type="number" min={0} step="0.01" value={daysPerStoryPoint} onChange={(e) => setDaysPerStoryPoint(Math.max(0, Number(e.target.value) || 0))} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard title="Total de issues" value={totals.totalIssues} icon={<ClipboardList className="h-4 w-4" />} />
          <KpiCard title="Story points" value={totals.totalStoryPoints} icon={<Gauge className="h-4 w-4" />} />
          <KpiCard title="Horas correctivas" value={totals.totalHours} icon={<Gauge className="h-4 w-4" />} />
          <KpiCard title="Días equivalentes" value={totals.totalEquivalentDays.toFixed(2)} icon={<Gauge className="h-4 w-4" />} />
          <KpiCard title="Capacidad neta" value={capacity.totalAvailableDays.toFixed(2)} icon={<Users className="h-4 w-4" />} />
          <KpiCard title="Carga total" value={totals.totalLoadDays.toFixed(2)} icon={<Gauge className="h-4 w-4" />} />
          <KpiCard title="Ocupación" value={`${capacity.totalOccupationPercent.toFixed(1)}%`} valueClassName={occupancyClass} icon={<Gauge className="h-4 w-4" />} />
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
                  <CardTitle className="text-base">Composición del sprint por tipo</CardTitle>
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
                <CardTitle className="text-base">Métricas de balance</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-6">
                <MetricBox title="Carga total asignada" value={`${totals.assignedCount}/${totals.totalIssues} items`} />
                <MetricBox title="Desarrolladores habilitados" value={`${enabledDevelopers.length} personas`} />
                <MetricBox title="Historias deseadas" value={totals.desiredCount} />
                <MetricBox title="Reuniones por persona" value={`${totals.totalMeetingDaysPerDeveloper.toFixed(2)} días`} />
                <MetricBox title="Personas sobrecargadas" value={capacity.overloadedCount} tone={capacity.overloadedCount > 0 ? "danger" : "success"} />
                <MetricBox title="Ajuste recomendado" value={capacity.totalOccupationPercent > 100 ? "Reducir alcance" : "Sprint balanceable"} tone={capacity.totalOccupationPercent > 100 ? "danger" : "success"} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Historias deseadas</CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-[88px] flex-wrap gap-2">
                {desiredIssues.length > 0 ? (
                  desiredIssues.map((issue) => (
                    <Badge key={issue.id} variant="secondary">
                      {issue.key}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">Todavia no marcaste historias como deseadas.</p>
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
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={addManualIssue}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar historia
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por key, resumen o asignado" />
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
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
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      {uniqueStatuses.map((status) => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      {uniquePriorities.map((priority) => (
                        <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={developerFilter} onValueChange={setDeveloperFilter}>
                    <SelectTrigger><SelectValue placeholder="Desarrollador" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Todos">Todos</SelectItem>
                      <SelectItem value="Sin definir">Sin definir</SelectItem>
                      {normalizedDevelopers.map((developer) => (
                        <SelectItem key={developer.id} value={developer.name}>{getPersonLabel(developer)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Deseada</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Key</TableHead>
                        <TableHead>Resumen</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Prioridad</TableHead>
                        <TableHead>Estimacion</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Días manuales</TableHead>
                        <TableHead>Días eq.</TableHead>
                        <TableHead>Asignado Jira</TableHead>
                        <TableHead>Sprint</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead>Actualizado</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssues.map((issue) => (
                        <TableRow key={issue.id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={issue.desired}
                              onChange={(e) => updateIssue(issue.id, { desired: e.target.checked })}
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
                          <TableCell className="min-w-[520px]">
                            <Input value={issue.summary} onChange={(e) => updateIssue(issue.id, { summary: e.target.value })} />
                          </TableCell>
                          <TableCell>
                            <Input value={issue.status} onChange={(e) => updateIssue(issue.id, { status: e.target.value })} className="w-44" />
                          </TableCell>
                          <TableCell>
                            <Input value={issue.priority} onChange={(e) => updateIssue(issue.id, { priority: e.target.value })} className="w-40" />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step="0.25"
                              value={issue.estimateRaw ?? 0}
                              onChange={(e) => updateIssueEstimate(issue.id, Number(e.target.value))}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={issue.storyPoints}
                              onChange={(e) =>
                                updateIssue(issue.id, {
                                  storyPoints: Math.max(0, Number(e.target.value) || 0),
                                  estimateRaw: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              disabled={!usesStoryPoints(issue.type)}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              value={issue.hours}
                              onChange={(e) =>
                                updateIssue(issue.id, {
                                  hours: Math.max(0, Number(e.target.value) || 0),
                                  estimateRaw: Math.max(0, Number(e.target.value) || 0),
                                })
                              }
                              disabled={!usesHours(issue.type)}
                              className="w-28"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step="0.25"
                              value={issue.manualDays}
                              onChange={(e) => updateIssue(issue.id, { manualDays: Math.max(0, Number(e.target.value) || 0) })}
                              className="w-28"
                            />
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
                <Alert>
                  <AlertDescription>
                    El desarrollador final se asigna desde la lista de personas habilitadas para reparto.
                  </AlertDescription>
                </Alert>
                <Alert>
                  <AlertDescription>
                    Las asignaciones a perfiles no desarrolladores quedan visibles, pero no suman esfuerzo, reuniones ni ocupacion del equipo.
                  </AlertDescription>
                </Alert>
                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Resumen</TableHead>
                        <TableHead>Días eq.</TableHead>
                        <TableHead>Asignado Jira</TableHead>
                        <TableHead>Desarrollador final</TableHead>
                        <TableHead>Perfil</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issuesWithRecalculation.map((issue) => (
                        <TableRow key={issue.id}>
                          <TableCell className="font-medium">
                            <a
                              href={getJiraIssueUrl(issue.key)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 underline-offset-2 hover:underline"
                            >
                              {issue.key}
                            </a>
                          </TableCell>
                          <TableCell><Badge variant={badgeVariant(issue.type)}>{issue.type}</Badge></TableCell>
                          <TableCell className="max-w-[420px] truncate">{issue.summary}</TableCell>
                          <TableCell>{issue.equivalentDays.toFixed(2)}</TableCell>
                          <TableCell>{issue.jiraAssignee}</TableCell>
                          <TableCell>
                            <NativeSelect
                              value={issue.finalDeveloper}
                              onChange={(value) => updateIssue(issue.id, { finalDeveloper: value })}
                              className="w-[280px]"
                            >
                              <option value="Sin definir">Sin definir</option>
                              {enabledPeople.map((developer) => (
                                <option key={developer.id} value={developer.name}>
                                  {getPersonLabel(developer)}
                                </option>
                              ))}
                            </NativeSelect>
                          </TableCell>
                          <TableCell>
                            {issue.finalDeveloper === "Sin definir" ? (
                              <Badge variant="secondary">Sin definir</Badge>
                            ) : (
                              <Badge variant={isDeveloperProfile(profileByPersonName.get(issue.finalDeveloper) || "Desarrollador") ? "default" : "outline"}>
                                {profileByPersonName.get(issue.finalDeveloper) || "Desarrollador"}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
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
                        <SelectItem key={profile} value={profile}>{profile}</SelectItem>
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
                        <TableHead>Días brutos</TableHead>
                        <TableHead>Días reuniones</TableHead>
                        <TableHead>Días disp.</TableHead>
                        <TableHead>Horas disp.</TableHead>
                        <TableHead>Points asignados</TableHead>
                        <TableHead>Horas asignadas</TableHead>
                        <TableHead>Días asignados</TableHead>
                        <TableHead>Días visuales</TableHead>
                        <TableHead>Ocupación</TableHead>
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
                            <NativeSelect
                              value={developer.profile}
                              onChange={(value) => updateDeveloper(developer.id, "profile", value)}
                              className="w-[160px]"
                            >
                              {PERSON_PROFILES.map((profile) => (
                                <option key={profile} value={profile}>
                                  {profile}
                                </option>
                              ))}
                            </NativeSelect>
                          </TableCell>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={developer.enabled}
                              onChange={(e) => updateDeveloper(developer.id, "enabled", e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} max={100} value={developer.availabilityPercent} onChange={(e) => updateDeveloper(developer.id, "availabilityPercent", Number(e.target.value))} className="w-24" />
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
                        {
                          id: crypto.randomUUID(),
                          category: "Reunion",
                          summary: "Nueva reunión",
                          hours: 1,
                          audience: "TODOS",
                          enabled: true,
                        },
                      ])
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar reunión
                  </Button>
                </div>
                <Alert>
                  <AlertDescription>
                    Las reuniones activas descuentan capacidad a cada desarrollador porque están consideradas como carga transversal del sprint para TODOS.
                  </AlertDescription>
                </Alert>
                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Activa</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Resumen</TableHead>
                        <TableHead>Horas</TableHead>
                        <TableHead>Audiencia</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {meetings.map((meeting) => (
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
                            <Input value={meeting.audience} onChange={(e) => updateMeeting(meeting.id, { audience: e.target.value })} className="w-28" />
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
  const toneClass = tone === "danger" ? "border-red-200 bg-red-50 text-red-700" : tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-700";
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
