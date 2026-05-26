# Changelog

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
