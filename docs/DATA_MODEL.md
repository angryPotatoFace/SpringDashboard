# Modelo de datos

## `Issue`

Representa un item del backlog.

- `id`: identificador local.
- `type`: tipo normalizado del item.
- `key`: clave de Jira.
- `summary`: resumen editable.
- `status`: estado visible.
- `estimateRaw`: valor editable principal segun el tipo. Para `Historia` / `Tarea` representa points. Para correctivos representa horas o dias segun `estimateUnit`.
- `estimateUnit`: unidad visible y editable de la estimacion. Usa `pts`, `h` o `d`.
- `storyPoints`: puntos efectivos cuando la unidad activa es `pts`.
- `hours`: horas efectivas cuando la unidad activa es `h`.
- `manualDays`: dias efectivos cuando la unidad activa es `d`.
- `equivalentDays`: esfuerzo comun usado por capacidad.
- `priority`: prioridad textual.
- `jiraAssignee`: persona original de Jira.
- `finalDeveloper`: asignacion final del sprint.
- `includedInSprint`: fuente de verdad para decidir si el item cuenta en el sprint.
- `desired`: campo legacy aun persistido; no forma parte del flujo principal actual.
- `sprint`: nombre o referencia del sprint de origen.
- `createdAt`: fecha de creacion.
- `updatedAt`: fecha de actualizacion.

## `DeveloperCapacity`

Representa una persona configurable del equipo.

- `id`: identificador local.
- `name`: nombre visible y clave de asignacion.
- `profile`: perfil funcional.
- `enabled`: habilita o deshabilita su participacion.
- `availabilityPercent`: porcentaje de dedicacion al sprint.
- `licenseDays`: dias no disponibles dentro del sprint.

## `Meeting`

Representa una carga transversal.

- `id`: identificador local.
- `category`: categoria funcional.
- `summary`: nombre de la reunion.
- `hours`: carga configurada.
- `audience`: `TODOS` o lista de nombres.
- `enabled`: indica si aplica al sprint actual.

## `BacklogFilters`

- `search`
- `typeFilter`
- `statusFilter`
- `priorityFilter`
- `developerFilter`
- `inclusionFilter`

## `PersistedState`

Snapshot del workspace guardado en `localStorage`.

- `developers`
- `sprintName`
- `startDate`
- `endDate`
- `workingDays`
- `hoursPerDay`
- `daysPerStoryPoint`
- `meetings`
- `rawInput`
- `issues`
- `filters`

## `TotalMetrics`

Agregados globales del sprint.

- `totalIssues`
- `includedIssues`
- `excludedIssues`
- `totalStoryPoints`
- `totalHours`
- `totalEquivalentDays`
- `correctives`
- `evolutives`
- `assignedCount`
- `pendingAssignmentCount`
- `pendingAssignmentDays`
- `totalMeetingHours`
- `totalMeetingDaysPerDeveloper`
- `totalMeetingDaysTeam`
- `totalLoadDays`
- `meetingDaysByDeveloper`

## `CapacityDetail`

Metricas por persona.

- `contributesToTeam`
- `grossAvailableDays`
- `meetingDays`
- `availableDays`
- `availableHours`
- `assignedIssues`
- `assignedDays`
- `assignedIssueDays`
- `visualAssignedIssues`
- `visualAssignedDays`
- `storyPoints`
- `hours`
- `rawOccupationPercent`
- `occupationPercent`

## `CapacitySummary`

Resumen global del equipo.

- `detail`
- `totalGrossDays`
- `totalAvailableDays`
- `totalAssignedDays`
- `rawOccupationPercent`
- `totalOccupationPercent`
- `balanceSpread`
- `overloadedCount`

## `SprintMetrics`

Resultado central derivado por `computeSprintMetrics`.

- `includedIssues`
- `assignmentIssues`
- `pendingAssignmentIssues`
- `totals`
- `capacity`
