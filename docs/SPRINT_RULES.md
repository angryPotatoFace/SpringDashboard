# Reglas del sprint

## Flujo funcional

### Etapa 1: Backlog editable

- Se cargan y editan items.
- Se estima esfuerzo.
- Se decide inclusion con `includedInSprint`.
- Un item incluido puede quedar sin `finalDeveloper`.

### Etapa 2: Reparto

- Solo trabaja sobre items incluidos.
- Define o corrige `finalDeveloper`.
- Debe mostrar pendientes de asignacion sin duplicar la edicion del backlog.

## Regla principal de inclusion

- `includedInSprint = true`: el item suma al sprint.
- `includedInSprint = false`: el item sigue visible, pero no suma a capacidad ni ocupacion.

## Regla de asignacion

- `jiraAssignee` representa el dato original de Jira.
- `finalDeveloper` representa la asignacion final del sprint.
- Si `finalDeveloper` esta `Sin definir`, el item:
  - suma al total general
  - no suma a ninguna persona
  - queda como pendiente

## Asignacion efectiva

Un item se considera efectivamente asignado cuando:

- esta incluido en sprint
- tiene `finalDeveloper`
- la persona esta habilitada y disponible para el sprint

Si la persona no esta disponible, el item sigue contando al total general pero no a la carga individual.

## Estimaciones

- `Historia` y `Tarea` usan `pts` por defecto, pero tambien pueden estimarse manualmente en `dias`.
- `Defecto`, `INC`, `Incidente` e `Incidencia` usan `h` por defecto, pero tambien pueden estimarse en `dias`.
- En la UI, la columna `Estimacion` debe mostrar siempre el valor con su unidad visible.
- No deben mostrarse leyendas explicativas debajo de cada fila del backlog.
- Si un item cambia de `Historia` / `Tarea` a `INC` / `Defecto`, los `storyPoints` dejan de contar en el calculo.
- Si un item cambia de `INC` / `Defecto` a `Historia` / `Tarea`, las `hours` dejan de contar en el calculo.
- Si la unidad activa es `dias`, ese valor impacta `equivalentDays` de forma directa.
- `equivalentDays` es la unidad comun para capacidad y ocupacion.

## Calculo de esfuerzo total

- `totalEquivalentDays` = suma de `equivalentDays` de todos los items incluidos.
- `totalLoadDays` = `totalEquivalentDays` + dias de reuniones del equipo.

## Calculo de esfuerzo por desarrollador

Para cada desarrollador disponible:

- `assignedIssueDays` = suma de `equivalentDays` de items incluidos asignados a esa persona
- `assignedDays` = `assignedIssueDays` + reuniones que le aplican
- `occupationPercent` visible = porcentaje acotado entre `0` y `100`

## Reuniones

- Solo descuentan a desarrolladores disponibles.
- Si una persona esta ausente o sin capacidad para el sprint, no se le descuentan reuniones.
- `audience` puede ser:
  - `TODOS`
  - lista de nombres separada por coma o punto y coma

## Validaciones importantes

- No mostrar ocupacion negativa.
- No mostrar ocupacion visible mayor a `100`.
- Evitar division por cero cuando no hay capacidad.
- Si se cambia `includedInSprint`, los totales deben actualizarse de inmediato.
- Si un item vuelve a incluirse, debe volver a sumar al sprint.

## Casos borde que no deben romperse

- backlog vacio
- sprint sin desarrolladores disponibles
- items incluidos sin asignacion
- items asignados a persona deshabilitada o no disponible
- reuniones activas con equipo parcialmente ausente
- mezcla de points, hours y manualDays
