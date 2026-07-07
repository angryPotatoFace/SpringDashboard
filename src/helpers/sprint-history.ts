/**
 * Sprint History - saves snapshots of completed sprints for velocity tracking.
 * Stored in localStorage separately from the active workspace.
 */

const HISTORY_STORAGE_KEY = "sprint-dashboard-history-v1";

export type SprintSnapshot = {
  id: string;
  sprintName: string;
  startDate: string;
  endDate: string;
  savedAt: string;
  // Committed metrics (what was planned)
  committedIssues: number;
  committedStoryPoints: number;
  committedHours: number;
  committedEquivalentDays: number;
  // Capacity
  teamSize: number;
  capacityNetDays: number;
  capacityGrossDays: number;
  meetingDaysTeam: number;
  // Load
  sprintLoadPercent: number;
  // Composition
  evolutives: number;
  correctives: number;
  // Carry-over tracking
  carryOverKeys: string[];
  // Issue keys included (for carry-over detection in next sprint)
  includedIssueKeys: string[];
};

export function loadSprintHistory(): SprintSnapshot[] {
  try {
    const stored = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSprintHistory(history: SprintSnapshot[]) {
  window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

export function addSprintSnapshot(snapshot: SprintSnapshot): SprintSnapshot[] {
  const history = loadSprintHistory();
  // Replace if same sprint name already exists
  const existingIndex = history.findIndex((s) => s.sprintName === snapshot.sprintName);
  if (existingIndex >= 0) {
    history[existingIndex] = snapshot;
  } else {
    history.push(snapshot);
  }
  // Keep max 20 sprints
  const trimmed = history.slice(-20);
  saveSprintHistory(trimmed);
  return trimmed;
}

export function removeSprintSnapshot(id: string): SprintSnapshot[] {
  const history = loadSprintHistory().filter((s) => s.id !== id);
  saveSprintHistory(history);
  return history;
}

export function getLastSprintIssueKeys(): string[] {
  const history = loadSprintHistory();
  if (history.length === 0) return [];
  return history[history.length - 1].includedIssueKeys || [];
}

export function detectCarryOver(currentIssueKeys: string[]): string[] {
  const lastKeys = new Set(getLastSprintIssueKeys());
  if (lastKeys.size === 0) return [];
  return currentIssueKeys.filter((key) => lastKeys.has(key));
}

export function computeVelocityStats(history: SprintSnapshot[]) {
  if (history.length === 0) return { average: 0, trend: 0, last: 0 };
  const points = history.map((s) => s.committedStoryPoints);
  const last = points[points.length - 1];
  const average = points.reduce((a, b) => a + b, 0) / points.length;
  // Trend: compare last 3 to previous 3
  const recent = points.slice(-3);
  const older = points.slice(-6, -3);
  const recentAvg = recent.length > 0 ? recent.reduce((a, b) => a + b, 0) / recent.length : 0;
  const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b, 0) / older.length : 0;
  const trend = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  return { average: Math.round(average * 10) / 10, trend: Math.round(trend), last };
}
