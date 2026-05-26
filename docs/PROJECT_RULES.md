# Reglas del proyecto

## Reglas generales

- No duplicar calculos de capacidad fuera de `computeSprintMetrics`.
- Mantener la separacion funcional:
  - `Backlog editable`: carga, edicion, estimacion e inclusion.
  - `Reparto`: asignacion final.
- No usar `finalDeveloper` como condicion para que un item cuente en el sprint total.
- No eliminar campos o flujos existentes sin revisar persistencia y exportacion.
- Si cambia el comportamiento real, actualizar documentacion en el mismo cambio.

## Reglas de TypeScript

- Reusar tipos existentes antes de crear nuevos nombres.
- Si se agrega un campo nuevo al backlog, actualizar:
  - tipo `Issue`
  - persistencia
  - parser / normalizacion
  - exportacion
- Evitar estados duplicados cuando el valor ya puede derivarse.

## Reglas de UI

- `Backlog editable` debe mostrar claramente que items estan incluidos y cuales no.
- `Reparto` no debe editar resumen, prioridad, estado o estimacion salvo necesidad real.
- Si una persona no esta disponible para el sprint, no debe aparecer como opcion nueva de reparto.
- Mantener visibles los datos originales de Jira aunque la asignacion final sea distinta.

## Reglas para capacidad

- El esfuerzo total del sprint toma todos los items con `includedInSprint = true`.
- El esfuerzo por persona solo toma items incluidos con asignacion efectiva a esa persona.
- Los items incluidos sin asignacion efectiva deben quedar como pendientes.
- Las reuniones descuentan solo a desarrolladores disponibles.
- Evitar divisiones por cero, porcentajes negativos y porcentajes visibles mayores a `100`.

## Reglas para reuniones

- No usar campo `key` en reuniones.
- Respetar `audience`.
- No descontar reuniones a personas ausentes o sin capacidad en el sprint.

## Consistencia de nombres

- Mantener `jiraAssignee` como asignacion original.
- Mantener `finalDeveloper` como asignacion final del sprint.
- Mantener `includedInSprint` como fuente de verdad de inclusion funcional.

## Si se toca exportacion o persistencia

- Verificar que `localStorage` siga restaurando el estado.
- Verificar que `XLSX` siga reflejando incluidos, pendientes y asignaciones finales.
- Verificar que `README.md`, `docs/CHANGELOG.md` y los docs funcionales sigan consistentes con el codigo.
