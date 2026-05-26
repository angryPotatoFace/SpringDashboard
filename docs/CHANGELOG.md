# Changelog

## 2026-05-26

### Recuperacion de funcionalidades documentadas

- Se restauro `includedInSprint` como fuente de verdad funcional para decidir si un item suma al sprint.
- Se recupero la columna unica de `Estimacion` con unidad visible (`pts`, `h`, `dias`) y recalculo centralizado.
- Se restauro `computeSprintMetrics` como fuente unica de calculo para incluidos, pendientes, reuniones, capacidad y ocupacion.
- La tab `Reparto` volvio a trabajar solo sobre items incluidos.
- Se agrego estado visible de asignacion para distinguir `Pendiente`, `Reasignar`, `Perfil no dev`, `Deshabilitado` y `Asignado`.

### Persistencia y experiencia

- La persistencia local vuelve a guardar el workspace completo:
  - backlog
  - texto importado
  - filtros
  - asignaciones
  - personas
  - reuniones
  - configuracion del sprint
- Los avisos superiores de `Backlog`, `Reparto` y `Reuniones` ahora pueden cerrarse y quedan recordados en `localStorage`.
- El alta manual del backlog vuelve a agregarse al final y hace scroll hacia la nueva fila.

### Exportacion y mantenimiento

- La exportacion `XLSX` ahora refleja inclusion, unidad visible, pendientes de reparto y ocupacion visible/real.
- Se dejo la documentacion sincronizada con esta version para reducir regresiones por cambios futuros.

## 2026-05-12

### Documentacion

- Se actualizo la documentacion funcional y tecnica del proyecto.
- Se dejo explicita la separacion entre `Backlog editable` y `Reparto`.

### Logica funcional

- `includedInSprint` quedo documentado como fuente principal para decidir si un item suma al sprint.
- Se documento que los items incluidos sin asignacion efectiva siguen sumando al total general y quedan pendientes de reparto.
- Se documento que la carga individual solo toma items incluidos con asignacion efectiva a personas disponibles.
- Se centralizo la regla de estimacion por tipo para evitar que un item sume `storyPoints` y `hours` al mismo tiempo.
- El alta manual del backlog quedo al final de la tabla y hace foco visual sobre la nueva fila.
- La tabla de backlog paso a usar una unica columna de `Estimacion` con unidad visible (`pts`, `h` o `dias`).
- Se eliminaron las leyendas explicativas debajo de cada fila de estimacion.
- Los avisos superiores del backlog ahora pueden cerrarse y se recuerdan en `localStorage`.

### Estado actual relevante

- Existe importacion desde texto y desde archivo `.csv` / `.txt`.
- Existe exportacion a `XLSX`.
- La logica principal sigue concentrada en `src/App.tsx`.
- La capacidad del sprint y la asignacion final ya no deben tratarse como el mismo problema funcional.
