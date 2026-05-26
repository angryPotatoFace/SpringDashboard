# TODO

## Prioridad alta

- Agregar tests automaticos para:
  - parser de Jira
  - conversion de duraciones
  - `sanitizeEstimateValues`
  - `buildIssueWithRecalculation`
  - `computeSprintMetrics`
- Confirmar la unidad real del seed de reuniones (`hours`).
- Corregir los textos con problemas de encoding que aun queden en UI o exportacion.

## Prioridad media

- Modularizar `src/App.tsx` moviendo helpers puros a archivos dedicados.
- Validar mejor importaciones:
  - duplicados
  - filas mal formadas
  - encabezados incompletos
- Revisar si el campo legacy `desired` puede eliminarse sin romper persistencia previa.
- Confirmar si la exportacion final debe incluir backlog completo o solo items incluidos.
- Agregar una vista o indicador mas explicito para items `Reasignar` dentro de `Reparto`.

## Prioridad baja

- Unificar el uso de `Select` y `NativeSelect`.
- Mejorar accesibilidad de tabs y selects.
- Dividir la UI por secciones o componentes por tab.
- Mejorar el warning de chunk grande del build con code splitting si el proyecto crece.

## Pendientes funcionales a revisar

- Confirmar si una asignacion a perfil no desarrollador debe seguir visible sin impactar capacidad.
- Confirmar si al dejar una persona sin capacidad durante todo el sprint conviene reasignar automaticamente sus items a `Sin definir`.
