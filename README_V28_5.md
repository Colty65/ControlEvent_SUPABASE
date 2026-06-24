# ControlEvent v15_prod - Hotpath cache legacy para móvil

Versión conservadora de rendimiento. No toca INFOEVENTO, BACKUP ni la carga de datos.

## Objetivo

Reducir recalculos repetidos detectados por `ControlEventLegacyUsage`:

- `selectedEvent` con cientos de miles de llamadas.
- `budgetSummary` y cálculos relacionados repetidos.
- selectores por evento usados varias veces dentro de renderizados.

## Nuevo módulo

```text
public/app/performance/legacy-hotpath.js
```

Expone:

```js
ControlEventHotpath.print()
ControlEventHotpath.inspect()
ControlEventHotpath.clear()
ControlEventHotpath.disable()
ControlEventHotpath.enable()
```

## Seguridad

El cache se invalida ante cambios/clicks/mutaciones legacy. Si se detecta algún comportamiento raro, puede desactivarse temporalmente con:

```js
ControlEventHotpath.disable()
```

## No se toca

- INFOEVENTO
- BACKUP
- Carga de datos
- ExcelJS bajo demanda
- Guardado Supabase
