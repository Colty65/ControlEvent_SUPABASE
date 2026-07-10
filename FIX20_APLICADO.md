# FIX20 aplicado sobre FIX19

Cambio mínimo, sin tocar login, selector, mantenimiento de ingresos ni descargas.

1. Vista aérea / Producto Disponible
   - Corrección del cálculo de descuentos negativos guardados como línea con importe/precio visible 0 pero producto o alias de precio negativo.
   - La línea de descuento ya no se fuerza a 0,00 € si el producto/concepto es DESCUENTO/DTO/ABONO/DEVOLUCIÓN/BONIFICACIÓN y existe precio efectivo negativo.
   - El descuento negativo entra en COMPRAS, SALDO ACTUAL, SALDO OPERATIVO y PRODUCTO DISPONIBLE.

2. Zuzu / Descripción del evento
   - Se refuerza la instrucción narrativa para que Zuzu use EVENTOS.Descripción como objetivo/contexto del evento al interpretar datos, valorar organización y redactar informes.
   - Se mantiene el campo Descripción en módulos EVENTOS y eventosObjetivo.

Archivos tocados:
- public/app/features/v19-mapa-recursos-global.js
- services/event-context.service.js
- services/event-ai.service.js
- public/index.html (cache bust de Vista aérea)
