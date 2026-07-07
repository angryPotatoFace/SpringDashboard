import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Download, Loader2, CloudOff, CheckCircle2, Settings2 } from "lucide-react";

import type { Issue } from "../types";
import type { JiraConfig, JiraSprint } from "../helpers/jira-api";
import {
  loadJiraConfig,
  saveJiraConfig,
  isJiraConfigured,
  fetchBoardSprints,
  fetchSprintIssues,
} from "../helpers/jira-api";
import { mapJiraIssuesToLocal } from "../helpers/jira-mapper";

type ImportState = "idle" | "loading" | "success" | "error";

type Props = {
  daysPerStoryPoint: number;
  hoursPerDay: number;
  onImport: (issues: Issue[], sprintName: string, startDate: string, endDate: string) => void;
};

export function JiraImportPanel({ daysPerStoryPoint, hoursPerDay, onImport }: Props) {
  const [config, setConfig] = useState<JiraConfig>(loadJiraConfig);
  const [showConfig, setShowConfig] = useState(!isJiraConfigured(loadJiraConfig()));
  const [state, setState] = useState<ImportState>("idle");
  const [error, setError] = useState("");
  const [sprints, setSprints] = useState<JiraSprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [sprintSearch, setSprintSearch] = useState("");

  useEffect(() => {
    saveJiraConfig(config);
  }, [config]);

  const updateConfig = (patch: Partial<JiraConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const loadSprints = useCallback(async () => {
    if (!isJiraConfigured(config)) {
      setError("Configura tu email y API token primero.");
      setState("error");
      return;
    }
    setState("loading");
    setError("");
    try {
      const [active, future] = await Promise.all([
        fetchBoardSprints(config, "active"),
        fetchBoardSprints(config, "future"),
      ]);
      const all = [...active, ...future];
      setSprints(all);
      if (all.length > 0 && !selectedSprintId) {
        setSelectedSprintId(all[0].id);
      }
      setState("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con Jira");
      setState("error");
    }
  }, [config, selectedSprintId]);

  const importFromSprint = useCallback(async () => {
    if (!isJiraConfigured(config)) {
      setError("Configura tu email y API token primero.");
      setState("error");
      return;
    }
    setState("loading");
    setError("");

    try {
      // If we have a selected sprint from the dropdown, use it directly
      if (selectedSprintId && sprints.length > 0) {
        const sprint = sprints.find((s) => s.id === selectedSprintId);
        if (sprint) {
          await doImport(sprint);
          return;
        }
      }

      // Otherwise, search by name (loads sprints automatically)
      const [active, future] = await Promise.all([
        fetchBoardSprints(config, "active"),
        fetchBoardSprints(config, "future"),
      ]);
      const all = [...active, ...future];
      setSprints(all);

      // Try to match by search text
      const search = sprintSearch.trim();
      let sprint: typeof all[0] | undefined;
      if (search) {
        // Normalize: remove extra spaces, compare loosely
        const normalized = search.toLowerCase().replace(/\s+/g, "");
        sprint = all.find((s) => s.name.toLowerCase().replace(/\s+/g, "").includes(normalized));
      }
      // Fallback: first active, then first future
      if (!sprint) sprint = all.find((s) => s.state === "active") || all[0];

      if (!sprint) {
        setError("No se encontro ningun sprint activo o futuro en el board.");
        setState("error");
        return;
      }

      setSelectedSprintId(sprint.id);
      await doImport(sprint);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar");
      setState("error");
    }
  }, [selectedSprintId, config, sprintSearch, sprints, daysPerStoryPoint, hoursPerDay, onImport]);

  const doImport = async (sprint: JiraSprint) => {
    setState("loading");
    setError("");
    try {
      const rawIssues = await fetchSprintIssues(config, sprint.id);
      const localIssues = mapJiraIssuesToLocal(rawIssues, daysPerStoryPoint, hoursPerDay, sprint.name);
      setImportedCount(localIssues.length);
      onImport(
        localIssues,
        sprint.name,
        sprint.startDate ? sprint.startDate.substring(0, 10) : "",
        sprint.endDate ? sprint.endDate.substring(0, 10) : ""
      );
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar issues");
      setState("error");
    }
  };

  return (
    <Card className="rounded-2xl border-none shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Importar desde Jira
          </span>
          <Button variant="ghost" onClick={() => setShowConfig((v) => !v)}>
            <Settings2 className="mr-1 h-4 w-4" />
            {showConfig ? "Ocultar config" : "Config"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showConfig && (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
              Tu token se guarda solo en localStorage de este navegador. Generalo en{" "}
              <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="text-blue-600 underline">
                Atlassian API Tokens
              </a>.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Email Atlassian</Label>
                <Input
                  type="email"
                  value={config.email}
                  onChange={(e) => updateConfig({ email: e.target.value })}
                  placeholder="tu@email.com"
                />
              </div>
              <div className="space-y-1">
                <Label>API Token</Label>
                <Input
                  type="password"
                  value={config.apiToken}
                  onChange={(e) => updateConfig({ apiToken: e.target.value })}
                  placeholder="Token de Atlassian"
                />
              </div>
              <div className="space-y-1">
                <Label>Board ID</Label>
                <Input
                  value={config.boardId}
                  onChange={(e) => updateConfig({ boardId: e.target.value })}
                  placeholder="1135"
                />
              </div>
              <div className="space-y-1">
                <Label>Jira Host</Label>
                <Input
                  value={config.jiraHost}
                  onChange={(e) => updateConfig({ jiraHost: e.target.value })}
                  placeholder="tecocloud.atlassian.net"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>CORS Proxy</Label>
                <Input
                  value={config.corsProxy}
                  onChange={(e) => updateConfig({ corsProxy: e.target.value })}
                  placeholder="https://corsproxy.io/?"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label>Buscar sprint</Label>
            <Input
              value={sprintSearch}
              onChange={(e) => setSprintSearch(e.target.value)}
              placeholder="ej: 26Q3"
              className="w-44"
            />
          </div>
          <Button variant="outline" onClick={loadSprints} disabled={state === "loading" || !isJiraConfigured(config)}>
            {state === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Cargar sprints
          </Button>
          {sprints.length > 0 && (
            <div className="space-y-1">
              <Label>Sprint</Label>
              <select
                value={selectedSprintId ?? ""}
                onChange={(e) => setSelectedSprintId(Number(e.target.value))}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
              >
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.state})
                  </option>
                ))}
              </select>
            </div>
          )}
          <Button onClick={importFromSprint} disabled={state === "loading" || !isJiraConfigured(config)}>
            {state === "loading" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Importar backlog
          </Button>
        </div>

        {state === "success" && (
          <Alert className="border-emerald-200 bg-emerald-50">
            <AlertDescription className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              {importedCount} issues importados correctamente.
            </AlertDescription>
          </Alert>
        )}

        {state === "error" && error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="flex items-center gap-2 text-red-700">
              <CloudOff className="h-4 w-4" />
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!isJiraConfigured(config) && !showConfig && (
          <p className="text-sm text-slate-500">Configura tu email y API token para importar desde Jira.</p>
        )}
      </CardContent>
    </Card>
  );
}
