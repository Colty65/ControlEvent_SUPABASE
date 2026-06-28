# ControlEvent v16_prod - v16_opt_2B

Corrección de la optimización de GRAFICAS.

Alcance cerrado:
- No cambia versión visible: sigue v16_prod.
- No toca planificación, compras, documentos, tickets, ingresos funcionales ni AVANCE DEL EVENTO.
- Solo toca el pintado de GRAFICAS y mantiene hidratación ligera de justificantes.

Cambios:
1. Eliminado el mensaje central "Calculando/Cargando gráficas".
2. Al cambiar de evento, se mantiene el último gráfico válido mientras llega el render definitivo, para no ver quesos en blanco.
3. Deduplicación de escrituras idénticas en #eventChartWrap para reducir retemblores.
4. Render final único al recibir `controlevent:opt1-event-stable`.
5. Mantiene carga de justificantes sin depender del botón Refrescar.

Prueba:
- Cambiar entre eventos desde GRAFICAS.
- No debe aparecer mensaje central de carga.
- No debe verse el gráfico vacío durante segundos.
- El gráfico final debe asentarse con un solo cambio visible.
