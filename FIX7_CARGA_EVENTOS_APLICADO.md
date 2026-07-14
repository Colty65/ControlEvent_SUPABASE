# FIX7 CARGA EVENTOS

Base: CE_v21_PROD_BASE_FIX7.zip.

Cambio mínimo:
- Se corrige defaultState para que no falle cuando la lista interna de eventos arranca vacía.
- No se restauran eventos de ejemplo.
- No se toca logon, selector, Zuzu, avance, resumen ni servicios.

Cambio exacto:
`defaults.selectedEventId = defaults.eventos[0].id;`
por
`defaults.selectedEventId = defaults.eventos[0]?.id || '';`
