# ControlEvent v22_prod · VOZ5 INFORMES COMPLETOS

Corrección del motor de informes de Zuzu:

- Un informe general activa como mínimo descripción del evento, ingresos, compras, donaciones, saldos, tickets/facturas y documentos.
- Ingresos separados entre socios y no socios.
- Compras desglosadas por destino, segmento, tienda, responsable y producto cuando se pide detalle.
- Donaciones desglosadas por donante, destino y producto.
- Tickets sin JSON técnico: se muestran en tabla legible.
- La descripción de ce_eventos se incorpora al texto del informe.
- Los documentos se incluyen con su descripción para que Zuzu pueda comentarlos.
- Regla de cobertura: responder a todos los apartados solicitados, nunca a menos.
- Menos contexto bruto y tablas más compactas para reducir timeouts y PDFs desproporcionados.

Base: CE_v22_PROD_VOZ4_MOVIL_ESTABLE.
