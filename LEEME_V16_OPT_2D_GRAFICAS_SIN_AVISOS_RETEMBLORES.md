# ControlEvent v16_prod - OPT 2D

Base: v16_opt_2C.

Cambios cerrados:

1. Se eliminan los avisos negros/pastillas de carga de cambio de evento.
2. `showLoading()` del conmutador de eventos queda silencioso, sin pintar "Cargando evento" dentro de la ventana.
3. En GRAFICAS no se vacía `eventChartWrap` durante el cambio de evento si ya hay una gráfica válida.
4. Se reducen las emisiones repetidas de `controlevent:event-ready` que causaban 3-4 repintados.
5. `renderAfterStable()` queda deduplicado por firma del evento/datos, para evitar repintados sucesivos con el mismo resultado.
6. No se toca planificación, compras, documentos, tickets, ingresos ni AVANCE DEL EVENTO.

Prueba recomendada: cambiar entre 3 eventos desde GRAFICAS y confirmar que no aparecen mensajes negros, que el último gráfico se mantiene hasta el nuevo, y que el asentamiento visual se reduce al mínimo.
