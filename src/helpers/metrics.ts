import type { CapacityDetail, CapacitySummary, DeveloperCapacity, Issue, Meeting, SprintMetrics, TotalMetrics } from "../types";
import { SIN_DEFINIR } from "../constants";
import { clampPercentage, isDeveloperProfile, normalizeText } from "./utils";
import { normalizeDeveloperCapacity } from "./normalize";

export function developerCanTakeEffectiveAssignment(developer: DeveloperCapacity, workingDays: number) {
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

export function getAssignmentStatus(issue: Issue, developers: DeveloperCapacity[], workingDays: number) {
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

export function computeSprintMetrics({
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
