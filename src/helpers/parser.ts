import type { Issue } from "../types";
import { SIN_DEFINIR } from "../constants";
import { normalizeText, normalizeType } from "./utils";
import { getDefaultEstimateUnit } from "./estimates";
import { normalizeIssue } from "./normalize";

export function detectSeparator(line: string) {
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

export function splitDelimitedLine(line: string): string[] {
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

export type HeaderMap = {
  type: number;
  key: number;
  summary: number;
  status: number;
  estimate: number;
  sprint: number;
  jiraAssignee: number;
  priority: number;
  createdAt: number;
  updatedAt: number;
} | null;

export function buildHeaderMap(headers: string[]): HeaderMap {
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

export function parseLine(line: string, index: number, daysPerStoryPoint: number, hoursPerDay: number, headers: HeaderMap = null): Issue | null {
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

export function parseIssues(input: string, daysPerStoryPoint: number, hoursPerDay: number): Issue[] {
  const lines = input.split(/\r?\n/).filter((line) => line.trim());
  const headerMap = lines.length > 0 ? buildHeaderMap(splitDelimitedLine(lines[0])) : null;
  const dataLines = headerMap ? lines.slice(1) : lines;

  return dataLines
    .map((line, index) => parseLine(line, index, daysPerStoryPoint, hoursPerDay, headerMap))
    .filter((issue): issue is Issue => Boolean(issue));
}
