/**
 * Maps raw Jira API issue data to the local Issue model.
 */
import type { Issue } from "../types";
import { SIN_DEFINIR } from "../constants";
import type { JiraIssueRaw } from "./jira-api";
import { normalizeIssue } from "./normalize";
import { normalizeType } from "./utils";

function extractStoryPoints(fields: JiraIssueRaw["fields"]): number {
  // Fields from Jira agile API can come as raw numbers or as { value: number } objects
  const extract = (val: unknown): number => {
    if (typeof val === "number" && val > 0) return val;
    if (val && typeof val === "object" && "value" in val) {
      const inner = (val as { value: unknown }).value;
      if (typeof inner === "number" && inner > 0) return inner;
    }
    return 0;
  };

  // Try story point fields in order of priority for tecocloud
  const fromCustom10200 = extract(fields.customfield_10200);
  if (fromCustom10200 > 0) return fromCustom10200;
  const fromStoryPoints = extract(fields.story_points);
  if (fromStoryPoints > 0) return fromStoryPoints;
  const fromCustom10016 = extract(fields.customfield_10016);
  if (fromCustom10016 > 0) return fromCustom10016;
  const fromCustom10028 = extract(fields.customfield_10028);
  if (fromCustom10028 > 0) return fromCustom10028;
  return 0;
}

function extractHoursFromOriginalEstimate(fields: JiraIssueRaw["fields"]): number {
  // timeoriginalestimate is in seconds, can come as number or { value: number }
  let seconds = 0;
  const val = fields.timeoriginalestimate;
  if (typeof val === "number" && val > 0) {
    seconds = val;
  } else if (val && typeof val === "object" && "value" in val) {
    const inner = (val as { value: unknown }).value;
    if (typeof inner === "number" && inner > 0) seconds = inner;
  }
  return seconds > 0 ? seconds / 3600 : 0;
}

function formatDate(isoString?: string): string {
  if (!isoString) return "";
  try {
    return isoString.substring(0, 10); // YYYY-MM-DD
  } catch {
    return "";
  }
}

/** Issue type names that represent subtasks and should be excluded from sprint planning imports. */
const SUBTASK_TYPE_NAMES = new Set([
  "subtarea", "sub-tarea", "sub-task", "subtask", "sub task",
]);

function isSubtask(fields: JiraIssueRaw["fields"]): boolean {
  const typeName = (fields.issuetype?.name || "").trim().toLowerCase();
  if (SUBTASK_TYPE_NAMES.has(typeName)) return true;
  // Jira also marks subtasks via the subtask flag in issuetype
  if (fields.issuetype?.subtask === true) return true;
  return false;
}

export function mapJiraIssuesToLocal(
  rawIssues: JiraIssueRaw[],
  daysPerStoryPoint: number,
  hoursPerDay: number,
  sprintName: string
): Issue[] {
  // Filter out subtasks — only import parent-level issues for sprint planning
  const parentIssues = rawIssues.filter((raw) => !isSubtask(raw.fields));

  return parentIssues.map((raw, index) => {
    const fields = raw.fields;
    const typeName = fields.issuetype?.name || "Tarea";
    const type = normalizeType(typeName);
    const storyPoints = extractStoryPoints(fields);
    const hours = extractHoursFromOriginalEstimate(fields);

    // Determine estimate: prefer story points for Historias/Tareas, hours for correctives
    let estimateRaw = 0;
    let estimateUnit: "pts" | "h" | "d" = "pts";

    if (type === "Historia" || type === "Tarea") {
      estimateRaw = storyPoints;
      estimateUnit = "pts";
    } else {
      // For correctives (INC, Defecto, Incidente, etc.)
      if (hours > 0) {
        estimateRaw = hours;
        estimateUnit = "h";
      } else if (storyPoints > 0) {
        // Some teams use story points for everything
        estimateRaw = storyPoints;
        estimateUnit = "pts";
      }
    }

    const partial: Partial<Issue> = {
      id: `jira-${raw.key}-${index}`,
      type,
      key: raw.key,
      summary: fields.summary || "Sin resumen",
      status: fields.status?.name || "Sin estado",
      estimateRaw,
      estimateUnit,
      storyPoints: estimateUnit === "pts" ? estimateRaw : 0,
      hours: estimateUnit === "h" ? estimateRaw : 0,
      manualDays: 0,
      priority: fields.priority?.name || "Sin prioridad",
      jiraAssignee: fields.assignee?.displayName || "Sin asignado",
      finalDeveloper: SIN_DEFINIR,
      includedInSprint: true,
      desired: false,
      sprint: fields.sprint?.name || sprintName,
      createdAt: formatDate(fields.created),
      updatedAt: formatDate(fields.updated),
    };

    return normalizeIssue(partial, index, daysPerStoryPoint, hoursPerDay);
  });
}
