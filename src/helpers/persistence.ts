import type { PersistedState } from "../types";
import {
  DEFAULT_DAYS_PER_STORY_POINT,
  DEFAULT_DISMISSED_ALERTS,
  DEFAULT_HOURS_PER_DAY,
  DEFAULT_SPRINT_DAYS,
  developersSeed,
  EMPTY_FILTERS,
  meetingsSeed,
  sampleText,
} from "../constants";
import { normalizeDeveloperCapacity, normalizeFilters, normalizeIssue, normalizeMeeting } from "./normalize";
import { parseIssues } from "./parser";

export function getInitialPersistedState(): PersistedState {
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

export function hydratePersistedState(raw: unknown): PersistedState {
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
