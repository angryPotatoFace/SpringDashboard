# AI Context

## Objetivo del proyecto

`Sprint Planner / Planificador de Sprint` ayuda a decidir que entra en un sprint, cuanto esfuerzo representa y como se reparte despues entre las personas del equipo.

## Modelo mental correcto

La aplicacion tiene dos momentos funcionales distintos:

1. `Backlog editable`
- Se cargan, editan y estiman items.
- Se decide si cada item `entra` o `no entra` al sprint.
- El flag clave es `includedInSprint`.
- Un item incluido suma al esfuerzo total aunque siga `Sin definir`.

2. `Reparto`
- Solo trabaja con items ya incluidos.
- Su responsabilidad principal es definir `finalDeveloper`.
- No debe duplicar la edicion completa del backlog.

## Problema que resuelve

- Convierte un export de Jira en una planificacion editable.
- Permite mezclar puntos, horas y dias manuales en una misma vista.
- Hace visible la diferencia entre esfuerzo total del sprint y esfuerzo ya repartido.
- Muestra impacto de reuniones, disponibilidad y licencias sobre la capacidad real.

## Reglas que la IA no debe romper

- `includedInSprint` define si un item suma o no al sprint.
- `finalDeveloper` no es obligatorio para que un item sume al total general.
- `Historia` y `Tarea` usan `storyPoints`.
- `Defecto`, `INC`, `Incidente` e `Incidencia` usan `hours`.
- `manualDays` siempre suma a `equivalentDays`.
- Las reuniones solo descuentan capacidad de desarrolladores disponibles.
- Personas ausentes, deshabilitadas o sin capacidad para el sprint no deben recibir nuevas asignaciones efectivas.
- La ocupacion visible debe quedar entre `0` y `100`, aunque internamente exista sobrecarga.

## Antes de modificar codigo

1. Leer [src/App.tsx](../src/App.tsx), en especial:
- `parseIssues`, `parseLine`, `buildHeaderMap`
- `buildIssueWithRecalculation`
- `sanitizeEstimateValues`
- `computeSprintMetrics`
- `exportToXlsx`

2. Leer:
- [docs/SPRINT_RULES.md](SPRINT_RULES.md)
- [docs/DATA_MODEL.md](DATA_MODEL.md)
- [docs/FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md)

3. Verificar si el cambio impacta:
- parser de backlog
- calculo de capacidad
- reuniones
- persistencia
- exportacion
- unidad visible de estimacion
- `includedInSprint`

4. Si el cambio esperado no coincide con el codigo actual, registrarlo en [docs/TODO.md](TODO.md).

5. Si el cambio modifica comportamiento real, actualizar en el mismo commit:
- [docs/CHANGELOG.md](CHANGELOG.md)
- [docs/FUNCTIONAL_REQUIREMENTS.md](FUNCTIONAL_REQUIREMENTS.md) si cambia alcance implementado
- [README.md](../README.md) si cambia instalacion, build o deploy

## Archivos mas sensibles

- [src/App.tsx](../src/App.tsx)
- [docs/SPRINT_RULES.md](SPRINT_RULES.md)
- [docs/DATA_MODEL.md](DATA_MODEL.md)
- [docs/PROJECT_RULES.md](PROJECT_RULES.md)
