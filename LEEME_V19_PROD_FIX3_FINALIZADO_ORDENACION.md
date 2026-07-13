# ControlEvent v20_prod - FIX3 Mapa gráfico global

Cambios aplicados sobre `CE_v19_PROD_MAPA_GLOBAL_FIX2.zip`:

1. **Ventana gráfica operativa en eventos Finalizados**
   - La ventana `Vista gráfica completa del evento` queda marcada como zona segura de consulta.
   - Se evita que los bloqueos de evento Finalizado deshabiliten radio buttons, botones Limpiar, Cerrar o los justificantes.
   - No se modifica ningún dato del evento; solo consulta y visualización.

2. **Justificantes de INGRESOS ampliables**
   - Los justificantes se abren con un visor propio de v19.
   - El visor también queda protegido frente al bloqueo de Finalizado.

3. **Ordenación por campos**
   - En INGRESOS se puede ordenar pulsando las cabeceras: Just., Nombre, Rango, Imp. obligado, Imp. voluntario y Total.
   - En COMPRAS + DONACIONES se puede ordenar pulsando las cabeceras: Producto, Segmento, Destino, Compras, Tienda, Donado, Donante, Importe, Situación y Resp.
   - Cada pulsación alterna ascendente / descendente.

4. **Trazabilidad**
   - Cache-bust actualizado en `index.html` y `public/index.html`.
   - ZIP final declarado como `CE_v19_PROD_MAPA_GLOBAL_FIX3.zip`.
