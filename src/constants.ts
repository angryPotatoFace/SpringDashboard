import type { BacklogFilters, DeveloperCapacity, Meeting, PersonProfile } from "./types";

export const STORAGE_KEY = "sprint-dashboard-workspace-v5";
export const SIN_DEFINIR = "Sin definir";
export const DEFAULT_HOURS_PER_DAY = 8;
export const DEFAULT_DAYS_PER_STORY_POINT = 0.77;
export const DEFAULT_SPRINT_DAYS = 10;
export const PIE_COLORS = ["#2563eb", "#7c3aed", "#dc2626", "#0f766e", "#f59e0b", "#64748b"];
export const PERSON_PROFILES: PersonProfile[] = ["Desarrollador", "Lider", "QA", "DevOps", "Otro"];
export const DEFAULT_DISMISSED_ALERTS: string[] = [];

export const EMPTY_FILTERS: BacklogFilters = {
  search: "",
  typeFilter: "Todos",
  statusFilter: "Todos",
  priorityFilter: "Todos",
  developerFilter: "Todos",
  inclusionFilter: "Todos",
};

export const developersSeed: DeveloperCapacity[] = [
  { id: crypto.randomUUID(), name: "Diego", profile: "Desarrollador", enabled: true, availabilityPercent: 100, licenseDays: 0 },
  { id: crypto.randomUUID(), name: "Jose", profile: "Desarrollador", enabled: true, availabilityPercent: 100, licenseDays: 0 },
  { id: crypto.randomUUID(), name: "Silvina", profile: "Desarrollador", enabled: true, availabilityPercent: 100, licenseDays: 0 },
  { id: crypto.randomUUID(), name: "Nuria", profile: "Desarrollador", enabled: true, availabilityPercent: 100, licenseDays: 0 },
  { id: crypto.randomUUID(), name: "Bruno", profile: "Desarrollador", enabled: true, availabilityPercent: 100, licenseDays: 0 },
];

export const meetingsSeed: Meeting[] = [
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

export const sampleText = `INC, FMR-21311, OSS - Fuerza de Trabajo - Field Manager - Error de Funcionalidad, Post Incident Activities, 2, FMR - 26Q2 - 1B, Nuria Malet Quintar,   , Medium (P2),   , 2026-03-06, 2026-04-14, x003264
INC, FMR-21531, Field Manager - Error de Funcionalidad - error en boton reemplazo, Post Incident Activities, 4, FMR - 26Q2 - 1B, BRUNO DANIEL BONINO,   , High (P1),   , 2026-03-30, 2026-04-23, x003264
Tarea, FMR-21662, Perisistir datos al momento que recibimos OT, Finished, 8, FMR - 26Q2 - 1B, Nuria Malet Quintar,   , Low (P3),   , 2026-04-14, 2026-04-23, Romina Castro
Historia, FMR-21638, Registro de OTs Fallidas (GM) - Accion asociada a boton Buscar (BE) (Parte 2), Aceptado, 9, FMR - 26Q2 - 1B, Jose Luis Tealdi,   , Low (P3),   , 2026-04-13, 2026-04-23, Romina Castro
Defecto, FMR-21705, GM - Registro de OTs Fallidas - Los filtros de busqueda no funcionan adecuadamente, Finalizada, 1, FMR - 26Q2 - 1B, BRUNO DANIEL BONINO,   , Low (P3),   , 2026-04-17, 2026-04-23, Mariana Rodriguez`;
