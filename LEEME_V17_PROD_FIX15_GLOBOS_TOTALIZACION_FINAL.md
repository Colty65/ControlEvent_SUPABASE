# ControlEvent v17_prod FIX15 - Globos con totalización inmediata

Base: `CE_v17_PROD_FIX14_GLOBOS_ORDEN_TOTALIZACION.zip`.

Cambio aplicado:
- Se añade un parche final cargado al final de la aplicación:
  `public/app/features/v17-fix15-globos-totalizacion-final.js`.
- Este parche normaliza los globos generados por las capas anteriores para que no vuelvan a quedar totalizaciones acumuladas al final.

Norma aplicada:
1. Cabecera del globo arriba.
2. Detalle ordenado por grupo:
   - Donaciones: donante A-Z y dentro producto A-Z.
   - Compras/gastos: ticket + tienda y dentro producto A-Z.
3. Al terminar cada grupo se inserta su TOTAL inmediatamente debajo.
4. En GRAFICAS, el globo de Pte. Compra conserva fondo rojo/rosa.
5. Se aplica en:
   - GRAFICAS.
   - Cálculos por segmento/destino.
   - Cálculos por tienda y ticket / summaryTiendaTicket.
   - RESUMEN PRESUPUESTARIO.
   - Modal blanco de presupuesto `ceBudgetLiteTooltipV307`.

No se han tocado:
- Fotos.
- Miniaturas.
- Visor de ticket/foto.
- Adjuntos.
- Permisos.
- Versión visible, que sigue como `v17_prod`.
