import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Badge } from "./components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import { Label } from "./components/ui/label";
import { Upload, CalendarRange, Users, Gauge, ClipboardList, Filter, Plus, Trash2, Download, RefreshCcw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import * as XLSX from "xlsx";

import type { BacklogFilters, DeveloperCapacity, InclusionFilter, Issue, Meeting, PersistedState } from "./types";
import type { PersonProfile } from "./types";
import {
  DEFAULT_DISMISSED_ALERTS,
  EMPTY_FILTERS,
  PERSON_PROFILES,
  PIE_COLORS,
  SIN_DEFINIR,
  STORAGE_KEY,
  sampleText,
} from "./constants";
import {
  clampPercentage,
  normalizeType,
  normalizeProfile,
  isDeveloperProfile,
  getJiraIssueUrl,
  kpiColor,
  badgeVariant,
  getPersonLabel,
} from "./helpers/utils";
import {
  getAllowedEstimateUnits,
  getDefaultEstimateUnit,
  getEstimateUnitLabel,
  sanitizeEstimateUnit,
  convertEquivalentDaysToEstimateRaw,
} from "./helpers/estimates";
import {
  normalizeDeveloperCapacity,
  normalizeMeeting,
  normalizeFilters,
  normalizeIssue,
  buildIssueWithRecalculation,
} from "./helpers/normalize";
import { parseIssues } from "./helpers/parser";
import { computeSprintMetrics, getAssignmentStatus } from "./helpers/metrics";
import { getInitialPersistedState, hydratePersistedState } from "./helpers/persistence";
import { KpiCard } from "./components/KpiCard";
import { MetricBox } from "./components/MetricBox";
import { DismissibleAlert } from "./components/DismissibleAlert";
import { NativeSelect } from "./components/NativeSelect";
import { JiraImportPanel } from "./components/JiraImportPanel";
import { SprintAlerts, generateSprintAlerts } from "./components/SprintAlerts";
import { SprintHistoryPanel } from "./components/SprintHistoryPanel";
import type { SprintSnapshot } from "./helpers/sprint-history";
import { loadSprintHistory, addSprintSnapshot, detectCarryOver } from "./helpers/sprint-history";


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
  const [sprintHistory, setSprintHistory] = useState<SprintSnapshot[]>(() => loadSprintHistory());

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
    () => computeSprintMetrics({ issues, developers: normalizedDevelopers, meetings: normalizedMeetings, workingDays, hoursPerDay }),
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
    includedIssues.forEach((issue) => { byType.set(issue.type, (byType.get(issue.type) || 0) + 1); });
    return Array.from(byType.entries()).map(([name, value]) => ({ name, value }));
  }, [includedIssues]);

  const developerChartData = useMemo(() => {
    return capacity.detail
      .filter((developer) => developer.enabled && developer.contributesToTeam)
      .map((developer) => ({ name: developer.name, carga: Number(developer.assignedDays.toFixed(2)), capacidad: Number(developer.availableDays.toFixed(2)) }));
  }, [capacity.detail]);

  const occupancyClass = kpiColor(capacity.totalOccupationPercent);

  // Sprint load: total included issue days vs net capacity (independent of assignment)
  const sprintLoadPercent = capacity.totalAvailableDays > 0
    ? (totals.totalEquivalentDays / capacity.totalAvailableDays) * 100
    : 0;
  const sprintLoadClass = kpiColor(sprintLoadPercent);

  // Smart alerts
  const sprintAlerts = useMemo(() => {
    const includedIssues2 = issues.filter((i) => i.includedInSprint);
    const issuesWithoutEstimate = includedIssues2
      .filter((i) => i.equivalentDays === 0)
      .map((i) => i.key);
    const carryOverKeys = detectCarryOver(includedIssues2.map((i) => i.key));
    return generateSprintAlerts({
      sprintLoadPercent,
      totalEquivalentDays: totals.totalEquivalentDays,
      capacityNetDays: capacity.totalAvailableDays,
      issuesWithoutEstimate,
      carryOverKeys,
      includedCount: totals.includedIssues,
    });
  }, [issues, sprintLoadPercent, totals, capacity]);

  const saveCurrentSnapshot = () => {
    const included = issues.filter((i) => i.includedInSprint);
    const carryOverKeys = detectCarryOver(included.map((i) => i.key));
    const snapshot: SprintSnapshot = {
      id: crypto.randomUUID(),
      sprintName,
      startDate,
      endDate,
      savedAt: new Date().toISOString(),
      committedIssues: included.length,
      committedStoryPoints: totals.totalStoryPoints,
      committedHours: totals.totalHours,
      committedEquivalentDays: totals.totalEquivalentDays,
      teamSize: normalizedDevelopers.filter((d) => d.enabled && d.profile === "Desarrollador").length,
      capacityNetDays: capacity.totalAvailableDays,
      capacityGrossDays: capacity.totalGrossDays,
      meetingDaysTeam: totals.totalMeetingDaysTeam,
      sprintLoadPercent,
      evolutives: totals.evolutives,
      correctives: totals.correctives,
      carryOverKeys,
      includedIssueKeys: included.map((i) => i.key),
    };
    const updated = addSprintSnapshot(snapshot);
    setSprintHistory(updated);
  };

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
        const nextEstimateRaw = nextUnit === issue.estimateUnit ? issue.estimateRaw : convertEquivalentDaysToEstimateRaw(issue.equivalentDays, nextUnit, daysPerStoryPoint, hoursPerDay);
        return buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, { type: nextType, estimateUnit: nextUnit, estimateRaw: nextEstimateRaw });
      })
    );
  };

  const updateIssueEstimate = (id: string, value: number) => {
    setIssues((current) => current.map((issue) => (issue.id === id ? buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, { estimateRaw: Math.max(0, value || 0) }) : issue)));
  };

  const updateIssueEstimateUnit = (id: string, nextUnit: string) => {
    setIssues((current) =>
      current.map((issue) => {
        if (issue.id !== id) return issue;
        const sanitizedUnit = sanitizeEstimateUnit(issue.type, nextUnit);
        const nextEstimateRaw = sanitizedUnit === issue.estimateUnit ? issue.estimateRaw : convertEquivalentDaysToEstimateRaw(issue.equivalentDays, sanitizedUnit, daysPerStoryPoint, hoursPerDay);
        return buildIssueWithRecalculation(issue, daysPerStoryPoint, hoursPerDay, { estimateUnit: sanitizedUnit, estimateRaw: nextEstimateRaw });
      })
    );
  };

  const addManualIssue = () => {
    const nextIndex = issues.length + 1;
    const nextIssue = normalizeIssue(
      { id: crypto.randomUUID(), type: "Historia", key: `MANUAL-${nextIndex}`, summary: "Nueva historia", status: "Backlog", estimateRaw: 1, estimateUnit: "pts", priority: "Low (P3)", jiraAssignee: "Sin asignado", finalDeveloper: SIN_DEFINIR, includedInSprint: true, desired: false, sprint: sprintName, createdAt: "", updatedAt: "" },
      issues.length, daysPerStoryPoint, hoursPerDay
    );
    setIssues((current) => [...current, nextIssue]);
    setLastAddedIssueId(nextIssue.id);
  };

  const removeIssue = (id: string) => { setIssues((current) => current.filter((issue) => issue.id !== id)); };

  const loadData = () => { setIssues(parseIssues(rawInput, daysPerStoryPoint, hoursPerDay)); setLastAddedIssueId(null); };

  const handleJiraImport = (importedIssues: Issue[], importedSprintName: string, importedStartDate: string, importedEndDate: string) => {
    setIssues(importedIssues);
    if (importedSprintName) setSprintName(importedSprintName);
    if (importedStartDate) setStartDate(importedStartDate);
    if (importedEndDate) setEndDate(importedEndDate);
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
    if (typeof window !== "undefined") { window.localStorage.removeItem(STORAGE_KEY); }
  };

  const ensureDeveloperExists = (name: string, profile: PersonProfile = "Desarrollador") => {
    const normalizedName = name.trim();
    if (!normalizedName) return null;
    const normalizedP = normalizeProfile(profile);
    const existingDeveloper = normalizedDevelopers.find((developer) => developer.name.toLowerCase() === normalizedName.toLowerCase());
    if (existingDeveloper) {
      if (!existingDeveloper.enabled || existingDeveloper.profile !== normalizedP) {
        setDevelopers((current) => current.map((developer) => (developer.id === existingDeveloper.id ? { ...developer, enabled: true, profile: normalizedP } : developer)));
      }
      return existingDeveloper.name;
    }
    setDevelopers((current) => [...current, normalizeDeveloperCapacity({ name: normalizedName, profile: normalizedP })]);
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
      if (currentDeveloper && !options.some((developer) => developer.name === currentDeveloper.name)) { options.push(currentDeveloper); }
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
  };

  const exportToXlsx = () => {
    const summaryRows = [
      { metric: "Sprint", value: sprintName }, { metric: "Fecha inicio", value: startDate }, { metric: "Fecha fin", value: endDate },
      { metric: "Dias habiles", value: workingDays }, { metric: "Horas por dia", value: hoursPerDay }, { metric: "Dias por story point", value: daysPerStoryPoint },
      { metric: "Total issues", value: totals.totalIssues }, { metric: "Incluidos", value: totals.includedIssues }, { metric: "Excluidos", value: totals.excludedIssues },
      { metric: "Story points", value: totals.totalStoryPoints }, { metric: "Horas correctivas", value: totals.totalHours },
      { metric: "Dias equivalentes", value: Number(totals.totalEquivalentDays.toFixed(2)) },
      { metric: "Pendientes de reparto", value: totals.pendingAssignmentCount }, { metric: "Dias pendientes", value: Number(totals.pendingAssignmentDays.toFixed(2)) },
      { metric: "Horas reuniones", value: totals.totalMeetingHours }, { metric: "Dias reuniones por persona", value: Number(totals.totalMeetingDaysPerDeveloper.toFixed(2)) },
      { metric: "Capacidad bruta", value: Number(capacity.totalGrossDays.toFixed(2)) }, { metric: "Capacidad neta", value: Number(capacity.totalAvailableDays.toFixed(2)) },
      { metric: "Carga total", value: Number(totals.totalLoadDays.toFixed(2)) }, { metric: "Ocupacion %", value: Number(capacity.totalOccupationPercent.toFixed(1)) },
      { metric: "Desbalance", value: Number(capacity.balanceSpread.toFixed(2)) },
    ];
    const backlogRows = issues.map((issue) => ({
      Tipo: issue.type, Key: issue.key, JiraUrl: getJiraIssueUrl(issue.key), Resumen: issue.summary, Estado: issue.status, Prioridad: issue.priority,
      IncluidoSprint: issue.includedInSprint ? "Si" : "No", Estimacion: issue.estimateRaw, Unidad: getEstimateUnitLabel(issue.estimateUnit),
      StoryPoints: issue.storyPoints, Horas: issue.hours, DiasManual: issue.manualDays, DiasEquivalentes: Number(issue.equivalentDays.toFixed(2)),
      AsignadoJira: issue.jiraAssignee, DesarrolladorFinal: issue.finalDeveloper, PerfilAsignado: profileByPersonName.get(issue.finalDeveloper) || "",
      SumaEsfuerzoEquipo: issue.includedInSprint ? "Si" : "No", Sprint: issue.sprint, FechaCreacion: issue.createdAt, FechaActualizacion: issue.updatedAt,
    }));
    const developerRows = capacity.detail.map((developer) => ({
      Persona: developer.name, Perfil: developer.profile, HabilitadoReparto: developer.enabled ? "Si" : "No",
      Disponibilidad: developer.availabilityPercent, Licencias: developer.licenseDays,
      DiasBrutos: Number(developer.grossAvailableDays.toFixed(2)), DiasReuniones: Number(developer.meetingDays.toFixed(2)),
      DiasDisponibles: Number(developer.availableDays.toFixed(2)), HorasDisponibles: Number(developer.availableHours.toFixed(2)),
      StoryPoints: developer.storyPoints, Horas: developer.hours, DiasAsignados: Number(developer.assignedDays.toFixed(2)),
      DiasVisuales: Number(developer.visualAssignedDays.toFixed(2)), IssuesAsignados: developer.assignedIssues, IssuesVisuales: developer.visualAssignedIssues,
      OcupacionVisible: Number(developer.occupationPercent.toFixed(1)), OcupacionReal: Number(developer.rawOccupationPercent.toFixed(1)),
    }));
    const meetingRows = normalizedMeetings.map((meeting) => ({
      Categoria: meeting.category, Resumen: meeting.summary, Horas: meeting.hours, Audiencia: meeting.audience, Activa: meeting.enabled ? "Si" : "No",
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
              <p className="mt-1 text-sm text-slate-500">Carga la informacion de Jira, ajusta estimaciones, descuenta reuniones, balancea el equipo y exporta un resumen del sprint.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={resetStoredConfiguration}><RefreshCcw className="mr-2 h-4 w-4" />Reset workspace</Button>
              <Button variant="outline" onClick={exportToXlsx}><Download className="mr-2 h-4 w-4" />Exportar XLSX</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="flex flex-col gap-4">
              <JiraImportPanel daysPerStoryPoint={daysPerStoryPoint} hoursPerDay={hoursPerDay} onImport={handleJiraImport} />
              <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4" />Carga manual (CSV/TXT)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Textarea value={rawInput} onChange={(e) => setRawInput(e.target.value)} className="min-h-[160px]" placeholder="Pega aca el TXT o CSV exportado desde Jira. Soporta campos vacios, nombres completos y textos entre comillas." />
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={loadData}>Procesar backlog</Button>
                    <Button variant="outline" onClick={() => { setRawInput(sampleText); setIssues(parseIssues(sampleText, daysPerStoryPoint, hoursPerDay)); }}>Cargar ejemplo</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarRange className="h-4 w-4" />Configuracion del sprint</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Nombre sprint</Label><Input value={sprintName} onChange={(e) => setSprintName(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Dias habiles</Label><Input type="number" min={0} value={workingDays} onChange={(e) => setWorkingDays(Math.max(0, Number(e.target.value) || 0))} /></div>
                  <div className="space-y-1"><Label>Fecha inicio</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Fecha fin</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Horas por dia</Label><Input type="number" min={1} value={hoursPerDay} onChange={(e) => setHoursPerDay(Math.max(1, Number(e.target.value) || 1))} /></div>
                  <div className="space-y-1"><Label>Dias por story point</Label><Input type="number" min={0} step="0.01" value={daysPerStoryPoint} onChange={(e) => setDaysPerStoryPoint(Math.max(0, Number(e.target.value) || 0))} /></div>
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
          <KpiCard title="Carga sprint" value={`${sprintLoadPercent.toFixed(1)}%`} valueClassName={sprintLoadClass} icon={<Gauge className="h-4 w-4" />} />
          <KpiCard title="Pendientes reparto" value={totals.pendingAssignmentCount} icon={<ClipboardList className="h-4 w-4" />} />
          <KpiCard title="Dias pendientes" value={totals.pendingAssignmentDays.toFixed(2)} icon={<Gauge className="h-4 w-4" />} />
          <KpiCard title="Evolutivos" value={totals.evolutives} icon={<ClipboardList className="h-4 w-4" />} />
          <KpiCard title="Correctivos" value={totals.correctives} icon={<ClipboardList className="h-4 w-4" />} />
          <KpiCard title="Ocupacion repartida" value={`${capacity.totalOccupationPercent.toFixed(1)}%`} valueClassName={occupancyClass} icon={<Gauge className="h-4 w-4" />} />
        </div>

        {sprintAlerts.length > 0 && <SprintAlerts alerts={sprintAlerts} />}

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6 rounded-2xl bg-white p-1 shadow-sm">
            <TabsTrigger value="overview">Resumen</TabsTrigger>
            <TabsTrigger value="issues">Backlog editable</TabsTrigger>
            <TabsTrigger value="assignment">Reparto</TabsTrigger>
            <TabsTrigger value="developers">Desarrolladores</TabsTrigger>
            <TabsTrigger value="meetings">Reuniones</TabsTrigger>
            <TabsTrigger value="history">Velocidad</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader><CardTitle className="text-base">Composicion del sprint por tipo</CardTitle></CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeChartData} dataKey="value" nameKey="name" outerRadius={110} label>
                        {typeChartData.map((entry, index) => (<Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-none shadow-sm">
                <CardHeader><CardTitle className="text-base">Capacidad vs carga por desarrollador</CardTitle></CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={developerChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" /><YAxis /><Tooltip />
                      <Bar dataKey="capacidad" fill="#cbd5e1" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="carga" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader><CardTitle className="text-base">Metricas de balance</CardTitle></CardHeader>
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
              <CardHeader><CardTitle className="text-base">Pendientes de asignacion</CardTitle></CardHeader>
              <CardContent className="flex min-h-[88px] flex-wrap gap-2">
                {pendingAssignmentIssues.length > 0 ? pendingAssignmentIssues.map((issue) => (<Badge key={issue.id} variant="secondary">{issue.key}</Badge>)) : <p className="text-sm text-slate-500">No hay items incluidos pendientes de reparto.</p>}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-none shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Filter className="h-4 w-4" />Backlog editable y filtros avanzados</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!dismissedAlerts.includes("issues-estimate-mode") ? (<DismissibleAlert onClose={() => dismissAlert("issues-estimate-mode")}>La columna Estimacion usa una unica unidad visible. Historias y tareas permiten pts o dias. Correctivos permiten h o dias.</DismissibleAlert>) : null}
                {!dismissedAlerts.includes("issues-inclusion-rule") ? (<DismissibleAlert onClose={() => dismissAlert("issues-inclusion-rule")}>includedInSprint decide si el item suma al sprint. Un item incluido puede quedar sin reparto y seguir contando al total general.</DismissibleAlert>) : null}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={addManualIssue}><Plus className="mr-2 h-4 w-4" />Agregar historia</Button>
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-6">
                  <Input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Buscar por key, resumen o asignado" />
                  <Select value={filters.typeFilter} onValueChange={(value) => setFilter("typeFilter", value)}>
                    <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="Historia">Historia</SelectItem><SelectItem value="Tarea">Tarea</SelectItem><SelectItem value="Defecto">Defecto</SelectItem><SelectItem value="INC">INC</SelectItem><SelectItem value="Incidente">Incidente</SelectItem><SelectItem value="Incidencia">Incidencia</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent>
                  </Select>
                  <Select value={filters.statusFilter} onValueChange={(value) => setFilter("statusFilter", value)}>
                    <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent><SelectItem value="Todos">Todos</SelectItem>{uniqueStatuses.map((status) => (<SelectItem key={status} value={status}>{status}</SelectItem>))}</SelectContent>
                  </Select>
                  <Select value={filters.priorityFilter} onValueChange={(value) => setFilter("priorityFilter", value)}>
                    <SelectTrigger><SelectValue placeholder="Prioridad" /></SelectTrigger>
                    <SelectContent><SelectItem value="Todos">Todos</SelectItem>{uniquePriorities.map((priority) => (<SelectItem key={priority} value={priority}>{priority}</SelectItem>))}</SelectContent>
                  </Select>
                  <Select value={filters.developerFilter} onValueChange={(value) => setFilter("developerFilter", value)}>
                    <SelectTrigger><SelectValue placeholder="Asignacion final" /></SelectTrigger>
                    <SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value={SIN_DEFINIR}>{SIN_DEFINIR}</SelectItem>{normalizedDevelopers.map((developer) => (<SelectItem key={developer.id} value={developer.name}>{getPersonLabel(developer)}</SelectItem>))}</SelectContent>
                  </Select>
                  <Select value={filters.inclusionFilter} onValueChange={(value) => setFilter("inclusionFilter", value as InclusionFilter)}>
                    <SelectTrigger><SelectValue placeholder="Inclusion" /></SelectTrigger>
                    <SelectContent><SelectItem value="Todos">Todos</SelectItem><SelectItem value="Incluidos">Incluidos</SelectItem><SelectItem value="Excluidos">Excluidos</SelectItem><SelectItem value="Pendientes">Pendientes</SelectItem></SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>En sprint</TableHead><TableHead>Tipo</TableHead><TableHead>Key</TableHead><TableHead>Resumen</TableHead><TableHead>Estado</TableHead><TableHead>Prioridad</TableHead><TableHead>Estimacion</TableHead><TableHead>Dias eq.</TableHead><TableHead>Asignado Jira</TableHead><TableHead>Sprint</TableHead><TableHead>Creado</TableHead><TableHead>Actualizado</TableHead><TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIssues.map((issue) => (
                        <TableRow key={issue.id} data-issue-id={issue.id} className={issue.id === lastAddedIssueId ? "bg-blue-50/60" : undefined}>
                          <TableCell><input type="checkbox" checked={issue.includedInSprint} onChange={(e) => updateIssue(issue.id, { includedInSprint: e.target.checked })} /></TableCell>
                          <TableCell>
                            <Select value={issue.type} onValueChange={(value) => updateIssueType(issue.id, value)}>
                              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
                              <SelectContent><SelectItem value="Historia">Historia</SelectItem><SelectItem value="Tarea">Tarea</SelectItem><SelectItem value="Defecto">Defecto</SelectItem><SelectItem value="INC">INC</SelectItem><SelectItem value="Incidente">Incidente</SelectItem><SelectItem value="Incidencia">Incidencia</SelectItem><SelectItem value="Otro">Otro</SelectItem></SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex min-w-[190px] flex-col gap-1">
                              <Input value={issue.key} onChange={(e) => updateIssue(issue.id, { key: e.target.value })} className="w-44" />
                              <a href={getJiraIssueUrl(issue.key)} target="_blank" rel="noreferrer" className="text-xs font-medium text-blue-600 underline-offset-2 hover:underline">Abrir en Jira</a>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[460px]"><Input value={issue.summary} onChange={(e) => updateIssue(issue.id, { summary: e.target.value })} /></TableCell>
                          <TableCell><Input value={issue.status} onChange={(e) => updateIssue(issue.id, { status: e.target.value })} className="w-44" /></TableCell>
                          <TableCell><Input value={issue.priority} onChange={(e) => updateIssue(issue.id, { priority: e.target.value })} className="w-40" /></TableCell>
                          <TableCell>
                            <div className="flex min-w-[180px] gap-2">
                              <Input type="number" min={0} step="0.25" value={issue.estimateRaw} onChange={(e) => updateIssueEstimate(issue.id, Number(e.target.value))} className="w-24" />
                              <NativeSelect value={issue.estimateUnit} onChange={(value) => updateIssueEstimateUnit(issue.id, value)} className="w-[82px]">
                                {getAllowedEstimateUnits(issue.type).map((unit) => (<option key={unit} value={unit}>{getEstimateUnitLabel(unit)}</option>))}
                              </NativeSelect>
                            </div>
                          </TableCell>
                          <TableCell>{issue.equivalentDays.toFixed(2)}</TableCell>
                          <TableCell><Input value={issue.jiraAssignee} onChange={(e) => updateIssue(issue.id, { jiraAssignee: e.target.value })} className="w-56" /></TableCell>
                          <TableCell><Input value={issue.sprint} onChange={(e) => updateIssue(issue.id, { sprint: e.target.value })} className="w-56" /></TableCell>
                          <TableCell><Input value={issue.createdAt} onChange={(e) => updateIssue(issue.id, { createdAt: e.target.value })} className="w-36" /></TableCell>
                          <TableCell><Input value={issue.updatedAt} onChange={(e) => updateIssue(issue.id, { updatedAt: e.target.value })} className="w-36" /></TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeIssue(issue.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
              <CardHeader><CardTitle className="text-base">Reparto manual del sprint</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!dismissedAlerts.includes("assignment-enabled-people") ? (<DismissibleAlert onClose={() => dismissAlert("assignment-enabled-people")}>El desarrollador final se asigna desde la lista de personas habilitadas para reparto.</DismissibleAlert>) : null}
                {!dismissedAlerts.includes("assignment-non-dev-profile") ? (<DismissibleAlert onClose={() => dismissAlert("assignment-non-dev-profile")}>Las asignaciones a perfiles no desarrolladores quedan visibles, pero no suman esfuerzo, reuniones ni ocupacion del equipo.</DismissibleAlert>) : null}
                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Key</TableHead><TableHead>Tipo</TableHead><TableHead>Resumen</TableHead><TableHead>Dias eq.</TableHead><TableHead>Asignado Jira</TableHead><TableHead>Desarrollador final</TableHead><TableHead>Perfil</TableHead><TableHead>Estado</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignmentIssues.map((issue) => {
                        const assignmentStatus = getAssignmentStatus(issue, normalizedDevelopers, workingDays);
                        return (
                          <TableRow key={issue.id}>
                            <TableCell className="font-medium"><a href={getJiraIssueUrl(issue.key)} target="_blank" rel="noreferrer" className="text-blue-600 underline-offset-2 hover:underline">{issue.key}</a></TableCell>
                            <TableCell><Badge variant={badgeVariant(issue.type)}>{issue.type}</Badge></TableCell>
                            <TableCell className="max-w-[420px] truncate">{issue.summary}</TableCell>
                            <TableCell>{issue.equivalentDays.toFixed(2)}</TableCell>
                            <TableCell>{issue.jiraAssignee}</TableCell>
                            <TableCell>
                              <NativeSelect value={issue.finalDeveloper} onChange={(value) => updateIssue(issue.id, { finalDeveloper: value })} className="w-[280px]">
                                <option value={SIN_DEFINIR}>{SIN_DEFINIR}</option>
                                {getAssignmentOptions(issue).map((developer) => (<option key={developer.id} value={developer.name}>{getPersonLabel(developer)}</option>))}
                              </NativeSelect>
                            </TableCell>
                            <TableCell>
                              {issue.finalDeveloper === SIN_DEFINIR ? (<Badge variant="secondary">{SIN_DEFINIR}</Badge>) : (<Badge variant={isDeveloperProfile(profileByPersonName.get(issue.finalDeveloper) || "Desarrollador") ? "default" : "outline"}>{profileByPersonName.get(issue.finalDeveloper) || "Sin perfil"}</Badge>)}
                            </TableCell>
                            <TableCell><Badge variant={assignmentStatus.tone}>{assignmentStatus.label}</Badge></TableCell>
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
              <CardHeader><CardTitle className="text-base">Equipo, perfiles y licencias</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 md:flex-row">
                  <Input value={newDeveloperName} onChange={(e) => setNewDeveloperName(e.target.value)} placeholder="Agregar persona" />
                  <Select value={newDeveloperProfile} onValueChange={(value) => setNewDeveloperProfile(normalizeProfile(value))}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Perfil" /></SelectTrigger>
                    <SelectContent>{PERSON_PROFILES.map((profile) => (<SelectItem key={profile} value={profile}>{profile}</SelectItem>))}</SelectContent>
                  </Select>
                  <Button onClick={addDeveloper}><Plus className="mr-2 h-4 w-4" />Agregar</Button>
                </div>
                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Persona</TableHead><TableHead>Perfil</TableHead><TableHead>Habilitado reparto</TableHead><TableHead>Disponibilidad %</TableHead><TableHead>Licencias</TableHead><TableHead>Dias brutos</TableHead><TableHead>Dias reuniones</TableHead><TableHead>Dias disp.</TableHead><TableHead>Horas disp.</TableHead><TableHead>Points asignados</TableHead><TableHead>Horas asignadas</TableHead><TableHead>Dias asignados</TableHead><TableHead>Dias visuales</TableHead><TableHead>Ocupacion</TableHead><TableHead></TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {capacity.detail.map((developer) => (
                        <TableRow key={developer.id}>
                          <TableCell><Input value={developer.name} onChange={(e) => updateDeveloper(developer.id, "name", e.target.value)} className="w-44" /></TableCell>
                          <TableCell><NativeSelect value={developer.profile} onChange={(value) => updateDeveloper(developer.id, "profile", value)} className="w-[160px]">{PERSON_PROFILES.map((profile) => (<option key={profile} value={profile}>{profile}</option>))}</NativeSelect></TableCell>
                          <TableCell><input type="checkbox" checked={developer.enabled} onChange={(e) => updateDeveloper(developer.id, "enabled", e.target.checked)} /></TableCell>
                          <TableCell><Input type="number" min={0} max={100} value={developer.availabilityPercent} onChange={(e) => updateDeveloper(developer.id, "availabilityPercent", Number(e.target.value))} className="w-24" /></TableCell>
                          <TableCell><Input type="number" min={0} value={developer.licenseDays} onChange={(e) => updateDeveloper(developer.id, "licenseDays", Number(e.target.value))} className="w-24" /></TableCell>
                          <TableCell>{developer.grossAvailableDays.toFixed(2)}</TableCell>
                          <TableCell>{developer.meetingDays.toFixed(2)}</TableCell>
                          <TableCell>{developer.availableDays.toFixed(2)}</TableCell>
                          <TableCell>{developer.availableHours.toFixed(2)}</TableCell>
                          <TableCell>{developer.storyPoints}</TableCell>
                          <TableCell>{developer.hours}</TableCell>
                          <TableCell>{developer.assignedDays.toFixed(2)}</TableCell>
                          <TableCell>{developer.visualAssignedDays.toFixed(2)}</TableCell>
                          <TableCell className={kpiColor(developer.occupationPercent)}>{developer.occupationPercent.toFixed(1)}%</TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => removeDeveloper(developer.name)}><Trash2 className="h-4 w-4" /></Button></TableCell>
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
              <CardHeader><CardTitle className="text-base">Reuniones y carga transversal del sprint</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setMeetings((current) => [...current, normalizeMeeting({ id: crypto.randomUUID(), category: "Reunion", summary: "Nueva reunion", hours: 1, audience: "TODOS", enabled: true })])}><Plus className="mr-2 h-4 w-4" />Agregar reunion</Button>
                </div>
                {!dismissedAlerts.includes("meetings-team-load") ? (<DismissibleAlert onClose={() => dismissAlert("meetings-team-load")}>Las reuniones activas descuentan capacidad a cada desarrollador disponible segun su audiencia y carga transversal del sprint.</DismissibleAlert>) : null}
                <div className="overflow-x-auto rounded-2xl border bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Activa</TableHead><TableHead>Categoria</TableHead><TableHead>Resumen</TableHead><TableHead>Horas</TableHead><TableHead>Audiencia</TableHead><TableHead></TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {normalizedMeetings.map((meeting) => (
                        <TableRow key={meeting.id}>
                          <TableCell><input type="checkbox" checked={meeting.enabled} onChange={(e) => updateMeeting(meeting.id, { enabled: e.target.checked })} /></TableCell>
                          <TableCell><Input value={meeting.category} onChange={(e) => updateMeeting(meeting.id, { category: e.target.value })} className="w-32" /></TableCell>
                          <TableCell><Input value={meeting.summary} onChange={(e) => updateMeeting(meeting.id, { summary: e.target.value })} className="min-w-[220px]" /></TableCell>
                          <TableCell><Input type="number" min={0} step="0.5" value={meeting.hours} onChange={(e) => updateMeeting(meeting.id, { hours: Math.max(0, Number(e.target.value) || 0) })} className="w-24" /></TableCell>
                          <TableCell><Input value={meeting.audience} onChange={(e) => updateMeeting(meeting.id, { audience: e.target.value })} className="w-40" /></TableCell>
                          <TableCell><Button variant="ghost" size="icon" onClick={() => setMeetings((current) => current.filter((item) => item.id !== meeting.id))}><Trash2 className="h-4 w-4" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-4">
            <SprintHistoryPanel
              history={sprintHistory}
              onHistoryChange={setSprintHistory}
              onSaveSnapshot={saveCurrentSnapshot}
              currentSprintName={sprintName}
              daysPerStoryPoint={daysPerStoryPoint}
              hoursPerDay={hoursPerDay}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
