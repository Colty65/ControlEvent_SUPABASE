# ControlEvent v22_prod - FIX8

## ColtyLAB contextual
- Sin evento seleccionado: abre la ficha inicial explicativa y muestra `v22_prod_fix8`.
- Con evento seleccionado: abre `AVANCE DEL EVENTO`.
- La versión de la ficha se lee desde una única marca de compilación (`meta[name=controlevent-build]`) para evitar que vuelva a quedarse en FIX5.

## Informes revisados
- La gráfica de queso SEGMENTO/DESTINO se conserva: los cálculos, parciales y colores son correctos.
- En comparativas con una familia entrecomillada, por ejemplo `"JORNADA SOLIDARIA VS ELA"`, solo entran títulos que contengan esa familia; no se añaden eventos por compartir únicamente `ELA`.
- Se respeta el número solicitado (`los 3 eventos`) y el alcance del usuario prevalece sobre el planificador.
- Una comparativa normal ya no adjunta automáticamente cientos de líneas. Los anexos completos solo aparecen cuando se pide `toda la información`, `detalle completo`, `desglose`, etc.
