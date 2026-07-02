# v16_prod OPT2H - GRAFICAS V46 hardlock

Versión visible mantenida: v16_prod.

Alcance cerrado: solo GRAFICAS.

Cambios:
- Añadido bloqueo duro temprano y tardío para que no se pinte la gráfica antigua de 4 quesos / 2 columnas.
- Solo se permite como gráfica válida la V46: `ce-v46-pies` con 6 tarjetas.
- Se interceptan escrituras a `eventChartWrap` desde el arranque.
- Se ignoran asignaciones antiguas a `renderGraficas`.
- Se desactivan directamente los renderizadores viejos V41/V43 para GRAFICAS.
- Se mantiene la última gráfica V46 válida mientras cambia el evento.

No tocado: planificación, compras, ingresos, documentos, tickets, avance del evento ni versión visible.
