# v16_prod OPT2J - GRAFICAS sin segundo refresco post-pintado

Base: v16_prod OPT2I.
Versión visible: se mantiene `v16_prod`.

## Objetivo
Quitar el pequeño retemblor que quedaba después de que la gráfica buena V46 ya estuviera pintada.

## Cambio aplicado
Se modifica únicamente el hardlock de GRAFICAS:

- Mantiene el bloqueo de gráficas viejas/intermedias.
- Sigue aceptando solo la gráfica V46 de 6 quesos / 3 columnas.
- Añade bloqueo post-commit: una vez pintada una gráfica V46 válida para el evento, no vuelve a escribir otra V46 inmediatamente.
- Evita schedules/runs finales redundantes si la gráfica actual ya es estricta y reciente.
- Cuenta diagnósticos nuevos en `window.ControlEventOpt2H`:
  - `duplicateCommitSkips`
  - `lockedCommitSkips`
  - `skippedSchedulesFresh`

## Archivos tocados
- `public/app/features/v16-opt2h-graficas-v46-hardlock.js`
- `index.html` solo para cache-bust `v16_opt_2j_early/late`.

## No tocado
- Planificación inicial
- Compras
- Ingresos
- Documentos
- Tickets
- AVANCE DEL EVENTO
- Versión visible
