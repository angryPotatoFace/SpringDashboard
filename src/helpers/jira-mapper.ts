/**
 * Maps raw Jira API issue data to the local Issue model.
 */
import type { Issue } from "../types";
import { SIN_DEFINIR } from "../constants";
import type { JiraIssueRaw } from "./jira-api";
import { normalizeIssue } from "./normalize";
import { normalizeType } from "./utils";

function extractStoryPoints(fields: JiraIssueRaw["fields"]): number {
  // Try story point fields in order of priority for tecocloud
  if (typeof fields.customfield_10200 === "number" && fields.customfield_10200 > 0) return fields.customfield_10200;
  if (typeof fields.story_points === "number" && fields.story_points > 0) return fields.story_points;
  if (typeof fields.customfield_10016 === "number" && fields.customfield_10016 > 0) return fields.customfield_10016;
  if (typeof fields.customfield_10028 === "number" && fields.customfield_10028 > 0) return fields.customfield_10028;
  return 0;
}

function extractHoursFromOriginalEstimate(fields: JiraIssueRaw["fields"]): number {
  // timeoriginalestimate is in seconds
  if (typeof fields.timeoriginalestimate === "number" && fields.timeoriginalestimate > 0) {
    return fields.timeoriginalestimate / 3600;
  }
  return 0;
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
