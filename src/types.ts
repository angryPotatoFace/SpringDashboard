export type IssueType = "Historia" | "Tarea" | "Defecto" | "INC" | "Incidente" | "Incidencia" | "Otro";
export type EstimateUnit = "pts" | "h" | "d";
export type PersonProfile = "Desarrollador" | "Lider" | "QA" | "DevOps" | "Otro";
export type InclusionFilter = "Todos" | "Incluidos" | "Excluidos" | "Pendientes";

export type Issue = {
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

export type DeveloperCapacity = {
  id: string;
  name: string;
  profile: PersonProfile;
  enabled: boolean;
  availabilityPercent: number;
  licenseDays: number;
};

export type Meeting = {
  id: string;
  category: string;
  summary: string;
  hours: number;
  audience: string;
  enabled: boolean;
};

export type BacklogFilters = {
  search: string;
  typeFilter: string;
  statusFilter: string;
  priorityFilter: string;
  developerFilter: string;
  inclusionFilter: InclusionFilter;
};

export type PersistedState = {
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

export type TotalMetrics = {
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

export type CapacityDetail = DeveloperCapacity & {
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

export type CapacitySummary = {
  detail: CapacityDetail[];
  totalGrossDays: number;
  totalAvailableDays: number;
  totalAssignedDays: number;
  rawOccupationPercent: number;
  totalOccupationPercent: number;
  balanceSpread: number;
  overloadedCount: number;
};

export type SprintMetrics = {
  includedIssues: Issue[];
  assignmentIssues: Issue[];
  pendingAssignmentIssues: Issue[];
  totals: TotalMetrics;
  capacity: CapacitySummary;
};
