# ControlEvent v16_prod - OPT2G GRAFICAS V46 ESTRICTA

Alcance cerrado: solo estabilización visual de GRAFICAS.

Cambios:
- La única gráfica aceptada en `eventChartWrap` es la V46 de 6 quesos con clase `ce-v46-pies`.
- Bloquea cualquier gráfica antigua/intermedia aunque tenga SALDO ACTUAL o VALORACION DEL EVENTO si no trae `ce-v46-pies`.
- Fuerza 3 quesos de ancho en escritorio.
- Mantiene la última gráfica V46 buena durante el cambio de evento.
- Si se cuela una gráfica vieja por una llamada antigua, el guard la sustituye por la V46.
- No toca planificación, compras, ingresos, documentos, tickets ni AVANCE.
