# v16_prod OPT3H - Resumen en reposo

Mantiene versión visible v16_prod.

Objetivo: conservar lo que ya funcionaba en OPT3G (donaciones clicables rápido) pero cortar el trabajo de fondo que seguía estresando el PC al cambiar de evento o alternar entre Gráficas y Resumen.

Cambios:
- No toca login, selector de evento, /api/state, Gráficas, Compras, Ingresos, Documentos, Tickets ni AVANCE.
- El hardlock de Resumen ya no exige data-ce-tip-v21 para considerar estable el bloque.
- Los renders forzados se descartan si la lista ya corresponde al evento/datos actuales.
- El observer de Resumen deja de mirar todo el subárbol y solo mira cambios directos del bloque.
- El renderBudget ya no provoca estabilizaciones de Resumen cuando la ventana no está visible.
- La capa de donaciones deja de borrar data-ce-tip/data-ce-tip-v21, evitando pelea con el hardlock.
- Marcado de donaciones más perezoso y deduplicado.
- Se elimina la escucha triple pointerup/click/touchend en escritorio.
