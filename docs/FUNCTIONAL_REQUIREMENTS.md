# Requisitos funcionales

## Backlog

### Implementado

- Carga desde texto pegado.
- Carga desde archivo `.csv` o `.txt`.
- Alta manual de items.
- El alta manual agrega el item al final del backlog.
- Edicion inline de:
  - tipo
  - key
  - resumen
  - estado
  - prioridad
  - estimacion con unidad visible
  - asignado Jira
  - sprint
  - fechas
- Cambio de tipo con recalculo.
- Scroll automatico a la nueva fila agregada manualmente cuando queda visible en la tabla.
- Flag `includedInSprint` para decidir si el item cuenta o no.
- Filtros por texto, tipo, estado, prioridad, asignacion final e inclusion.
- Regla de estimacion por tipo:
  - `Historia` y `Tarea` usan `pts` por defecto y tambien permiten `dias`
  - `INC`, `Incidente`, `Incidencia` y `Defecto` usan `h` por defecto y tambien permiten `dias`
  - la unidad se muestra en la misma columna de estimacion
  - no se muestran leyendas por fila debajo del input
  - los avisos superiores pueden cerrarse

### Pendiente o a revisar

- Validacion mas fuerte de duplicados y filas mal formadas.
- Confirmar si el campo legacy `desired` puede eliminarse del modelo persistido.

## Equipo

### Implementado

- Seed inicial con `Diego`, `Jose`, `Silvina`, `Nuria` y `Bruno`.
- Alta, edicion y baja de personas.
- Perfiles: `Desarrollador`, `Lider`, `QA`, `DevOps`, `Otro`.
- `enabled`, `availabilityPercent` y `licenseDays`.
- Renombrado manteniendo asignaciones existentes.

### Pendiente o a revisar

- No existe una entidad separada de ausencia.
- La ausencia hoy se modela con `enabled`, `availabilityPercent` y `licenseDays`.

## Sprint

### Implementado

- Nombre del sprint.
- Fecha inicio y fin.
- Dias habiles.
- Horas por dia.
- Dias por story point.
- KPIs generales de carga, capacidad y ocupacion.

### Pendiente o a revisar

- No hay validacion automatica entre fechas y dias habiles.

## Reuniones

### Implementado

- Alta, edicion, habilitacion y eliminacion.
- Impacto en capacidad disponible.
- Soporte de `audience` para `TODOS` o lista simple de nombres.
- Exportacion en `XLSX`.

### Pendiente o a revisar

- Confirmar semantica exacta del seed `hours`: hoy parece carga acumulada del sprint y no minutos por evento.

## Capacidad

### Implementado

- El esfuerzo total del sprint toma todos los items incluidos.
- Los items no incluidos no afectan capacidad.
- Los items incluidos sin asignacion efectiva quedan como pendientes.
- La carga individual solo toma items incluidos asignados a personas disponibles.
- La app no duplica el esfuerzo de un item sumando `storyPoints` y `hours` al mismo tiempo.
- `Dias eq.` permanece como valor calculado para capacidad.
- Las reuniones descuentan solo a desarrolladores disponibles.
- Ocupacion visible acotada a `0-100`.
- Proteccion frente a divisiones por cero.

### Pendiente o a revisar

- Agregar tests automaticos para `computeSprintMetrics`.

## Exportacion

### Implementado

- Exportacion a `XLSX`.
- Hojas:
  - `Resumen`
  - `Backlog`
  - `Desarrolladores`
  - `Reuniones`

### Pendiente o a revisar

- Confirmar si el export final debe incluir solo items incluidos o backlog completo.

## Persistencia

### Implementado

- `localStorage` del workspace actual:
  - backlog
  - texto importado
  - filtros
  - asignaciones
  - personas
  - reuniones
  - configuracion del sprint

### Pendiente o a revisar

- No existe persistencia por multiples sprints o snapshots historicos.
