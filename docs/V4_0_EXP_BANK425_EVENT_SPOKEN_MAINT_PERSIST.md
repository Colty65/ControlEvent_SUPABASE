# BANK4_25 · Nombre hablado visible en Mantenimiento EVENTOS

## Diagnóstico
`eventFromDb()` ya devolvía `nombreHablado` desde `ce_eventos.nombre_hablado` y la BBDD conservaba el dato.
El fallo estaba en cliente: `mergeLoadedState()` reconstruía cada evento tras login/refresco/cambio de evento, pero omitía `nombreHablado`.
Por eso el campo podía verse justo después de modificarlo y desaparecer de la ventana de Mantenimiento al recargar, sin haberse borrado en Supabase.

## Corrección
La hidratación de EVENTOS conserva ahora `nombreHablado`, aceptando además los alias de compatibilidad `nombre_hablado`, `tituloVoz` y `titulo_voz`.
No cambia el SQL ni la estructura de la tabla.

## Invariante
`ce_eventos.nombre_hablado` -> `/api/state.eventos[].nombreHablado` -> `mergeLoadedState().eventos[].nombreHablado` -> input `edit-evento-nombrehablado`.
