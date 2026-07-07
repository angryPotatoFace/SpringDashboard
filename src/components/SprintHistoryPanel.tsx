import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Trash2, TrendingUp, Save, Download, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

import type { SprintSnapshot } from "../helpers/sprint-history";
import { computeVelocityStats, removeSprintSnapshot, addSprintSnapshot } from "../helpers/sprint-history";
import { loadJiraConfig, isJiraConfigured, fetchBoardSprints, fetchSprintIssues } from "../helpers/jira-api";
import type { JiraSprint } from "../helpers/jira-api";
import { mapJiraIssuesToLocal } from "../helpers/jira-mapper";

type Props = {
  history: SprintSnapshot[];
  onHistoryChange: (history: SprintSnapshot[]) => void;
  onSaveSnapshot: () => void;
  currentSprintName: string;
  daysPerStoryPoint: number;
  hoursPerDay: number;
};

export function SprintHistoryPanel({ history, onHistoryChange, onSaveSnapshot, currentSprintName, daysPerStoryPoint, hoursPerDay }: Props) {
  const [showTable, setShowTable] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const velocity = computeVelocityStats(history);

  const chartData = history.map((s) => ({
    name: s.sprintName.replace(/^FMR\s*-\s*/i, "").trim(),
    "Story Points": s.committedStoryPoints,
    "Dias eq.": Number(s.committedEquivalentDays.toFixed(1)),
    "Capacidad": Number(s.capacityNetDays.toFixed(1)),
  }));

  const handleRemove = (id: string) => {
    const updated = removeSprintSnapshot(id);
    onHistoryChange(updated);
  };

  const importClosedSprints = async () => {
    const config = loadJiraConfig();
    if (!isJiraConfigured(config)) {
      setImportMsg("Configura tu email y API token en la seccion de importar Jira.");
      return;
    }
    setImporting(true);
    setImportMsg("");
    try {
      // Fetch last 10 closed sprints
      const closedSprints = await fetchBoardSprints(config, "closed");
      // Sort by start date descending, take last 6
      const sorted = closedSprints
        .filter((s: JiraSprint) => s.startDate)
        .sort((a: JiraSprint, b: JiraSprint) => (a.startDate || "").localeCompare(b.startDate || ""))
        .slice(-6);

      let imported = 0;
      for (const sprint of sorted) {
        // Skip if already in history
        if (history.some((h) => h.sprintName === sprint.name)) continue;

        const rawIssues = await fetchSprintIssues(config, sprint.id);
        const localIssues = mapJiraIssuesToLocal(rawIssues, daysPerStoryPoint, hoursPerDay, sprint.name);
        const totalSP = localIssues.reduce((acc, i) => acc + i.storyPoints, 0);
        const totalEqDays = localIssues.reduce((acc, i) => acc + i.equivalentDays, 0);

        const snapshot: SprintSnapshot = {
          id: crypto.randomUUID(),
          sprintName: sprint.name,
          startDate: sprint.startDate ? sprint.startDate.substring(0, 10) : "",
          endDate: sprint.endDate ? sprint.endDate.substring(0, 10) : "",
          savedAt: new Date().toISOString(),
          committedIssues: localIssues.length,
          committedStoryPoints: totalSP,
          committedHours: localIssues.reduce((acc, i) => acc + i.hours, 0),
          committedEquivalentDays: totalEqDays,
          teamSize: 5,
          capacityNetDays: 0, // Unknown for historical
          capacityGrossDays: 0,
          meetingDaysTeam: 0,
          sprintLoadPercent: 0,
          evolutives: localIssues.filter((i) => i.type === "Historia" || i.type === "Tarea").length,
          correctives: localIssues.filter((i) => ["Defecto", "INC", "Incidente", "Incidencia"].includes(i.type)).length,
          carryOverKeys: [],
          includedIssueKeys: localIssues.map((i) => i.key),
        };
        addSprintSnapshot(snapshot);
        imported++;
      }

      const updatedHistory = (await import("../helpers/sprint-history")).loadSprintHistory();
      onHistoryChange(updatedHistory);
      setImportMsg(imported > 0 ? `${imported} sprint${imported > 1 ? "s" : ""} importado${imported > 1 ? "s" : ""} al historial.` : "Todos los sprints recientes ya estan en el historial.");
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "Error al importar historial");
    } finally {
      setImporting(false);
    }
  };

  const alreadySaved = history.some((s) => s.sprintName === currentSprintName);

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Velocidad del equipo
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={importClosedSprints} disabled={importing}>
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Importar historial
              </Button>
              <Button variant="outline" onClick={onSaveSnapshot}>
                <Save className="mr-2 h-4 w-4" />
                {alreadySaved ? "Actualizar snapshot" : "Guardar sprint"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {history.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                No hay historial todavia. Importa los sprints anteriores desde Jira o guarda el sprint actual para empezar a trackear velocidad.
              </p>
              {importMsg && <Alert className="border-blue-200 bg-blue-50"><AlertDescription className="text-blue-700 text-sm">{importMsg}</AlertDescription></Alert>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <VelocityStat label="Velocidad promedio" value={`${velocity.average} pts`} />
                <VelocityStat label="Ultimo sprint" value={`${velocity.last} pts`} />
                <VelocityStat
                  label="Tendencia"
                  value={velocity.trend > 0 ? `+${velocity.trend}%` : `${velocity.trend}%`}
                  tone={velocity.trend > 0 ? "success" : velocity.trend < -10 ? "danger" : "neutral"}
                />
              </div>

              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Capacidad" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Dias eq." fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Story Points" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {importMsg && <Alert className="border-blue-200 bg-blue-50"><AlertDescription className="text-blue-700 text-sm">{importMsg}</AlertDescription></Alert>}
            </>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Historial de sprints ({history.length})</span>
              <Button variant="ghost" onClick={() => setShowTable((v) => !v)}>
                {showTable ? "Ocultar detalle" : "Ver detalle"}
              </Button>
            </CardTitle>
          </CardHeader>
          {showTable && (
            <CardContent>
              <div className="overflow-x-auto rounded-xl border bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sprint</TableHead>
                      <TableHead>Fechas</TableHead>
                      <TableHead>Issues</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Dias eq.</TableHead>
                      <TableHead>Capacidad</TableHead>
                      <TableHead>Carga %</TableHead>
                      <TableHead>Carry-over</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.sprintName}</TableCell>
                        <TableCell className="text-xs">{s.startDate} → {s.endDate}</TableCell>
                        <TableCell>{s.committedIssues}</TableCell>
                        <TableCell>{s.committedStoryPoints}</TableCell>
                        <TableCell>{s.committedEquivalentDays.toFixed(1)}</TableCell>
                        <TableCell>{s.capacityNetDays.toFixed(1)}</TableCell>
                        <TableCell>
                          <Badge variant={s.sprintLoadPercent > 100 ? "destructive" : s.sprintLoadPercent > 85 ? "secondary" : "default"}>
                            {s.sprintLoadPercent.toFixed(0)}%
                          </Badge>
                        </TableCell>
                        <TableCell>{s.carryOverKeys.length}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleRemove(s.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}

function VelocityStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "success" | "danger" | "neutral" }) {
  const toneClass = tone === "success" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : "text-slate-900";
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}
