# Guia de componentes y zonas del codigo

## Vista principal

### [src/App.tsx](../src/App.tsx)

Concentra casi toda la aplicacion:

- tipos
- seeds
- parser de backlog
- recalculo de items
- capacidad
- persistencia
- exportacion
- tabs de UI

## Zonas importantes dentro de `App.tsx`

### Parser e importacion

- `parseIssues`
- `parseLine`
- `buildHeaderMap`
- `decodeImportedText`

Responsabilidad:
- convertir texto o CSV en `Issue[]`
- tolerar encabezados variables de Jira

### Recalculo por item

- `buildIssueWithRecalculation`
- `sanitizeEstimateValues`
- `updateIssueEstimate`
- `updateIssueType`

Responsabilidad:
- mantener sincronizados `storyPoints`, `hours`, `manualDays`, `estimateRaw` y `equivalentDays`
- asegurar que cada tipo use solo su unidad principal de estimacion
- mantener `estimateUnit` coherente con el tipo y con la unidad visible en tabla

### Fuente unica de calculo

- `computeSprintMetrics`

Responsabilidad:
- separar items incluidos de excluidos
- detectar pendientes de asignacion
- calcular capacidad general e individual
- aplicar reuniones y disponibilidad

Regla:
- no duplicar esta logica en otras tabs

### Tab `issues`

Responsabilidad:
- alta manual
- edicion del backlog
- filtros
- inclusion o exclusion del sprint
- alta manual al final de la tabla con foco visual en la nueva fila
- mostrar una unica columna `Estimacion` con unidad visible
- para historias y tareas, permitir `pts` o `dias`
- para correctivos, permitir `h` o `dias`
- no renderizar leyendas explicativas por fila debajo del input
- mostrar avisos superiores cerrables
- persistir filtros y texto importado en `localStorage`

No deberia:
- convertirse en una segunda pantalla de reparto

### Tab `assignment`

Responsabilidad:
- mostrar items incluidos
- editar `finalDeveloper`
- dejar visible `jiraAssignee`
- mostrar si un item esta pendiente o necesita reasignacion
- no mezclar items excluidos del sprint

No deberia:
- duplicar resumen, prioridad, estado o estimacion del backlog

### Tab `developers`

Responsabilidad:
- administrar personas
- perfiles
- habilitacion
- disponibilidad
- licencias

### Tab `meetings`

Responsabilidad:
- administrar reuniones transversales
- controlar `audience`
- afectar capacidad disponible

### Exportacion

- `exportToXlsx`

Responsabilidad:
- volcar resumen, backlog, desarrolladores y reuniones

## Componentes UI auxiliares

`src/components/ui/` contiene wrappers livianos como:

- `Card`
- `Button`
- `Input`
- `Select`
- `Tabs`
- `Table`

No contienen logica funcional critica; la logica real vive en `App.tsx`.

## Recomendaciones para modificar sin romper

- Si cambias inclusion o asignacion, revisar `computeSprintMetrics`.
- Si agregas un campo de backlog, revisar parser, persistencia, UI y exportacion.
- Si cambias reuniones, revisar `meetingAppliesToDeveloper`.
- Si separas `App.tsx`, mover primero helpers puros y despues tabs.
