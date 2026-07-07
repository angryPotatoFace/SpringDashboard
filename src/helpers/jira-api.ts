/**
 * Jira Cloud REST API integration.
 *
 * Architecture:
 * - Uses Atlassian REST API v2/v3 via a CORS proxy (since GitHub Pages can't call Jira directly).
 * - The user provides their Atlassian email + API token (stored in localStorage).
 * - We use cors-anywhere or allorigins as fallback. For production, a dedicated proxy is recommended.
 *
 * Default board: 1135 (FMR)
 * Default instance: tecocloud.atlassian.net
 */

const JIRA_STORAGE_KEY = "sprint-dashboard-jira-config";
const DEFAULT_BOARD_ID = "1135";
const DEFAULT_JIRA_HOST = "tecocloud.atlassian.net";

// Public CORS proxies for development. In production, use your own.
const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.allorigins.win/raw?url=",
];

export type JiraConfig = {
  email: string;
  apiToken: string;
  boardId: string;
  jiraHost: string;
  corsProxy: string;
};

export type JiraSprint = {
  id: number;
  name: string;
  state: "active" | "future" | "closed";
  startDate?: string;
  endDate?: string;
  goal?: string;
};

export type JiraIssueRaw = {
  key: string;
  fields: {
    issuetype?: { name?: string; subtask?: boolean };
    summary?: string;
    status?: { name?: string };
    priority?: { name?: string };
    assignee?: { displayName?: string };
    // Story points - varies by Jira instance
    story_points?: number;
    customfield_10200?: number; // Story points in tecocloud
    customfield_10016?: number; // Common story point field (other instances)
    customfield_10028?: number; // Alternative story point field
    timeoriginalestimate?: number | null; // In seconds
    created?: string;
    updated?: string;
    sprint?: { name?: string };
    labels?: string[];
  };
};

export function getDefaultJiraConfig(): JiraConfig {
  return {
    email: "",
    apiToken: "",
    boardId: DEFAULT_BOARD_ID,
    jiraHost: DEFAULT_JIRA_HOST,
    corsProxy: CORS_PROXIES[0],
  };
}

export function loadJiraConfig(): JiraConfig {
  try {
    const stored = window.localStorage.getItem(JIRA_STORAGE_KEY);
    if (!stored) return getDefaultJiraConfig();
    const parsed = JSON.parse(stored) as Partial<JiraConfig>;
    return {
      email: parsed.email || "",
      apiToken: parsed.apiToken || "",
      boardId: parsed.boardId || DEFAULT_BOARD_ID,
      jiraHost: parsed.jiraHost || DEFAULT_JIRA_HOST,
      corsProxy: parsed.corsProxy || CORS_PROXIES[0],
    };
  } catch {
    return getDefaultJiraConfig();
  }
}

export function saveJiraConfig(config: JiraConfig) {
  window.localStorage.setItem(JIRA_STORAGE_KEY, JSON.stringify(config));
}

export function isJiraConfigured(config: JiraConfig): boolean {
  return Boolean(config.email.trim() && config.apiToken.trim());
}

function buildAuthHeader(config: JiraConfig): string {
  return "Basic " + btoa(`${config.email}:${config.apiToken}`);
}

async function jiraFetch<T>(config: JiraConfig, path: string): Promise<T> {
  const baseUrl = `https://${config.jiraHost}`;
  const targetUrl = `${baseUrl}${path}`;
  const proxiedUrl = `${config.corsProxy}${encodeURIComponent(targetUrl)}`;

  const response = await fetch(proxiedUrl, {
    method: "GET",
    headers: {
      Authorization: buildAuthHeader(config),
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Jira API error ${response.status}: ${text.substring(0, 200)}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchBoardSprints(config: JiraConfig, state?: "active" | "future" | "closed"): Promise<JiraSprint[]> {
  const stateParam = state ? `&state=${state}` : "";
  const data = await jiraFetch<{ values: JiraSprint[] }>(
    config,
    `/rest/agile/1.0/board/${config.boardId}/sprint?maxResults=20${stateParam}`
  );
  return data.values || [];
}

export async function fetchSprintIssues(config: JiraConfig, sprintId: number): Promise<JiraIssueRaw[]> {
  const allIssues: JiraIssueRaw[] = [];
  let startAt = 0;
  const maxResults = 50;

  // Paginate through all issues in the sprint
  while (true) {
    const data = await jiraFetch<{ issues: JiraIssueRaw[]; total: number }>(
      config,
      `/rest/agile/1.0/sprint/${sprintId}/issue?startAt=${startAt}&maxResults=${maxResults}&fields=issuetype,summary,status,priority,assignee,story_points,customfield_10200,customfield_10016,customfield_10028,timeoriginalestimate,created,updated,sprint,labels`
    );

    allIssues.push(...(data.issues || []));

    if (allIssues.length >= data.total || (data.issues || []).length < maxResults) {
      break;
    }
    startAt += maxResults;
  }

  return allIssues;
}

/**
 * Finds the sprint matching a name fragment (e.g., "26Q3" or "FMR-26Q3").
 * Falls back to the first active or future sprint if no match.
 */
export async function findSprintByName(config: JiraConfig, nameFragment?: string): Promise<JiraSprint | null> {
  // First try active sprints
  const activeSprints = await fetchBoardSprints(config, "active");
  if (nameFragment) {
    const match = activeSprints.find((s) => s.name.toLowerCase().includes(nameFragment.toLowerCase()));
    if (match) return match;
  }
  if (activeSprints.length > 0 && !nameFragment) return activeSprints[0];

  // Then try future sprints
  const futureSprints = await fetchBoardSprints(config, "future");
  if (nameFragment) {
    const match = futureSprints.find((s) => s.name.toLowerCase().includes(nameFragment.toLowerCase()));
    if (match) return match;
  }
  if (futureSprints.length > 0) return futureSprints[0];

  // If nameFragment provided but not found in active/future, return first active
  if (activeSprints.length > 0) return activeSprints[0];

  return null;
}
