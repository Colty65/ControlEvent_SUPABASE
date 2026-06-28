# ControlEvent v16_prod - OPT2C

Alcance: solo estabilización visual de GRAFICAS y mantenimiento de hidratación de justificantes.

Cambios:
- No se vacía `eventChartWrap` durante cambio de evento.
- Bloquea estados intermedios de gráfica sin datos que generaban quesos en blanco.
- Mantiene el último gráfico válido hasta que el nuevo gráfico ya contiene datos.
- Agrupa repintados consecutivos para reducir retemblores.
- No muestra mensajes centrales de carga.
- Mantiene hidratación de justificantes de ingresos al estabilizar evento.

No toca:
- planificación inicial
- compras extra
- tickets
- documentos
- avance del evento
- versión visible, que sigue siendo v16_prod
