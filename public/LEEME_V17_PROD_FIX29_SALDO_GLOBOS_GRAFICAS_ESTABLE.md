# CE v17_prod FIX29 - saldo 0, orden de globos y gráficas estables

Base: CE_v17_PROD_FIX28_SALDO0_ORDEN_GLOBOS.zip

Cambios:

1. GRAFICAS / SALDO ACTUAL y SALDO OPERATIVO
   - Si el saldo es 0,00 €, la tarjeta completa abre el detalle.
   - El centro blanco del donut ya no captura el clic.
   - El detalle se conserva aunque el valor neto sea cero: ingresos y gastos que justifican el saldo.

2. RESUMEN PRESUPUESTARIO / Globos DONACION DE PRODUCTO
   - El globo TOTAL se ordena por bloques fijos: TIENDAS, SOCIOS y NO SOCIOS.
   - Dentro de cada bloque se ordena por donante y producto.
   - El total de cada donante queda justo debajo de sus líneas, no separado al final.

3. RESUMEN PRESUPUESTARIO / Globos OPERATIVA
   - El globo general separa bloques: GASTOS REALIZADOS, GASTOS DE ORGANIZACION y PTE.COMPRA U OTROS GASTOS.
   - Los totales de tienda/ticket permanecen junto a sus líneas.

4. GRAFICAS / cambio de evento
   - Durante la carga/cambio de evento no se acepta como final la gráfica intermedia todo a cero.
   - Se mantiene contenido anterior cuando exista hasta que llegue la gráfica V46 válida.

No se cambian cálculos ni datos.
