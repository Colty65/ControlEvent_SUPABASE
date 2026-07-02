# ControlEvent v16_prod - OPT2F GRAFICAS V46 UNICA

Mantiene versión visible `v16_prod`.

Alcance cerrado: solo GRAFICAS y estabilización visual.

Cambios:
- Bloquea la gráfica antigua de 4 quesos / 2 columnas que se estaba pintando primero.
- Fuerza como única gráfica válida la v46: 6 quesos / 3 columnas, con SALDO ACTUAL y VALORACION DEL EVENTO.
- Mantiene la última gráfica v46 válida mientras termina el cambio de evento.
- Bloquea escrituras intermedias de carga, blanco o gráfica antigua.
- Hace un render final único cuando el evento queda estable.
- No toca planificación, compras, ingresos, documentos, tickets ni AVANCE DEL EVENTO.

Diagnóstico:
- `window.ControlEventOpt2F`
