# CE_v22_PROD_BASE_FIX23_PARTE1

Base: CE_v22_PROD_BASE_FIX7_DONACIONES_OK.

Cambios limitados a la parte 1:

1. Ficha ColtyLAB sin evento seleccionado
   - El selector DOM manda sobre `state.selectedEventId`.
   - Si `#selectedEvent` está vacío, ColtyLAB abre la ficha informativa/version, no el AVANCE vacío.
   - Se cierran/ocultan capas antiguas de avance y se elimina el botón flotante fantasma de cerrar.

2. Bug backend `eventos is not defined`
   - En `buildZuzuPlanningCatalog` se entrega `eventos: events`.

No se ha aplicado todavía el rediseño grande de Zuzu/plantillas SQL.
No se toca logon, selector, resumen, gráficas, vista aérea, donaciones visuales, ingresos ni rendimiento.
