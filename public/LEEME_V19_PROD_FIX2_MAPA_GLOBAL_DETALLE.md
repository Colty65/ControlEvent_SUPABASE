# ControlEvent v22_prod FIX2 - Mapa global detalle

Cambios aplicados sobre `CE_v19_PROD_MAPA_GLOBAL_FIX1.zip`:

1. Ventana `Vista gráfica completa del evento`:
   - Se quita el texto `ControlEvent v22_prod` del subtítulo de la ventana.
   - En su lugar aparece el estado del evento: `En curso` en verde o `Finalizado` en rojo.

2. INGRESOS:
   - Leyendas del queso forzadas a fondo y texto visibles.
   - Al pulsar una porción/leyenda se muestra el detalle en el panel derecho.
   - Formato: Justificante, Nombre, Rango, Imp. obligado, Imp. voluntario y Total.
   - Registros en verde si están ingresados y en rojo si están pendientes.

3. COMPRAS + DONACIONES:
   - La ficha pasa a la columna izquierda, debajo de INGRESOS y con el mismo ancho.
   - Incluye radios de SEGMENTO y DESTINO.
   - Solo se puede seleccionar un radio cada vez.
   - Botón `Ver todo` para quitar el filtro y volver al listado completo.

4. Panel derecho:
   - Ocupa el resto de la ventana.
   - Muestra inicialmente todos los productos.
   - Al elegir segmento o destino filtra los registros correspondientes.
   - Al pulsar ingresos se reutiliza el mismo panel derecho para personas/justificantes.
   - Listado compacto con columnas:
     Producto, Segmento, Destino, Compras, Tienda, Donado, Donante, Importe, Situación y Resp.
   - Rojo para Pte.Compra, verde para TKxx/Gastos corrientes y tonos de donación para donaciones.

Archivos modificados:
- `app/features/v19-mapa-recursos-global.js`
- `public/app/features/v19-mapa-recursos-global.js`
- `index.html`
- `public/index.html`

Comprobación realizada:
- `node --check app/features/v19-mapa-recursos-global.js`
- `node --check public/app/features/v19-mapa-recursos-global.js`
