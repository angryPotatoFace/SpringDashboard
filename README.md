# Sprint Planner / Planificador de Sprint

Aplicacion web para planificar un sprint a partir de un backlog cargado desde Jira o creado manualmente. Permite estimar esfuerzo, calcular capacidad del equipo, descontar reuniones, contemplar ausencias y repartir trabajo antes de exportar la planificacion.

## Funcionalidades principales

- Carga de backlog desde texto pegado o archivo `.csv` / `.txt`.
- Edicion inline de items del backlog.
- Separacion entre:
  - `Backlog editable`: carga, edicion, estimacion e inclusion en sprint.
  - `Reparto`: asignacion final de items ya incluidos.
- Soporte para `Historia`, `Tarea`, `Defecto`, `INC`, `Incidente`, `Incidencia` y `Otro`.
- Conversion de `storyPoints`, `hours` y `manualDays` a `equivalentDays`.
- Configuracion de personas, perfiles, disponibilidad y licencias.
- Impacto de reuniones transversales en la capacidad.
- Exportacion a `XLSX`.
- Persistencia local del workspace actual con `localStorage`.

## Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- Recharts
- `xlsx`

## Instalacion

```bash
npm install
```

## Ejecucion

```bash
npm run dev
```

Build:

```bash
npm run build
```

Preview:

```bash
npm run preview
```

## Estructura general

```text
src/
  App.tsx            UI principal, tipos, parser y logica de calculo
  main.tsx           bootstrap de React
  index.css          estilos base
  components/ui/     wrappers UI simples usados por App.tsx
docs/
  AI_CONTEXT.md
  PROJECT_RULES.md
  FUNCTIONAL_REQUIREMENTS.md
  SPRINT_RULES.md
  DATA_MODEL.md
  COMPONENTS_GUIDE.md
  TODO.md
  CHANGELOG.md
```

## Notas importantes

- La fuente principal de verdad funcional hoy sigue en [src/App.tsx](src/App.tsx).
- La capacidad general del sprint toma todos los items con `includedInSprint = true`, aunque no tengan asignacion final.
- La carga individual solo toma items incluidos con una asignacion efectiva a una persona disponible para el sprint.
- Antes de tocar logica de capacidad o reuniones conviene leer `docs/AI_CONTEXT.md`, `docs/SPRINT_RULES.md` y `docs/DATA_MODEL.md`.
