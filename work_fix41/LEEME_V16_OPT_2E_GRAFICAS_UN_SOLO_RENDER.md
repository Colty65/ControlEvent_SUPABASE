# v16_opt_2E - GRAFICAS sin retemblores

Versión visible: v16_prod.

Alcance cerrado:
- Solo GRAFICAS durante cambio de evento.
- No toca planificación, compras, ingresos, documentos, tickets ni avance del evento.

Cambios:
- Bloquea escrituras intermedias de los quesos durante cambio de evento.
- Mantiene la última gráfica válida mientras el evento nuevo termina de asentarse.
- Convierte varias peticiones de render en un único render final.
- No muestra avisos negros de carga.
- Evita repintados duplicados por misma firma de evento/datos.

Prueba:
- Cambiar entre evento pequeño/medio/grande desde GRAFICAS.
- Debe verse un único salto final de gráfico, no 2-4 retemblores.
