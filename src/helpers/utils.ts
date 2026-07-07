import type { IssueType, PersonProfile } from "../types";

export function clampPercentage(value: number) {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function normalizeText(value: string) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function normalizeType(value: string): IssueType {
  const lower = normalizeText(value);
  if (["historia", "historia de usuario", "story", "user story"].includes(lower)) return "Historia";
  if (["tarea", "task", "subtarea", "sub-task", "sub task"].includes(lower)) return "Tarea";
  if (["defecto", "defect", "bug", "error"].includes(lower)) return "Defecto";
  if (lower === "inc") return "INC";
  if (["incidente", "incident"].includes(lower)) return "Incidente";
  if (["incidencia", "issue"].includes(lower)) return "Incidencia";
  return "Otro";
}

export function normalizeProfile(value?: string | null): PersonProfile {
  const lower = normalizeText(value || "");
  if (["desarrollador", "developer", "dev"].includes(lower)) return "Desarrollador";
  if (["lider", "leader", "lead"].includes(lower)) return "Lider";
  if (["qa", "tester"].includes(lower)) return "QA";
  if (["devops", "dev ops"].includes(lower)) return "DevOps";
  return "Otro";
}

export function isDeveloperProfile(profile: PersonProfile) {
  return profile === "Desarrollador";
}

export function getJiraIssueUrl(issueKey: string) {
  return `https://tecocloud.atlassian.net/browse/${issueKey.trim().toUpperCase()}`;
}

export function kpiColor(occupation: number) {
  if (occupation > 100) return "text-red-600";
  if (occupation > 85) return "text-amber-600";
  return "text-emerald-600";
}

export function badgeVariant(type: IssueType) {
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

export function getPersonLabel(developer: Pick<{ name: string; profile: string }, "name" | "profile">) {
  return `${developer.name} (${developer.profile || "Desarrollador"})`;
}
