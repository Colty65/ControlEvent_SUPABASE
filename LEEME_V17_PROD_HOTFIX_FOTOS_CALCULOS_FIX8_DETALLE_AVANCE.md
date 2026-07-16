# ControlEvent v22_prod - FIX8 Detalle completo / cierre abajo / avance fijo

No cambia la versión visible: sigue siendo v22_prod.

Base: FIX7_DETALLE_SIN_I.

Cambios:

1. Cálculos por tienda y ticket
   - Mantiene intacto el arreglo de fotos de FIX6/FIX7.
   - Elimina definitivamente el icono azul (i).
   - Al pulsar una fila se reconstruye el detalle completo desde `compras` del evento, aunque el resumen previo venga sin `headers/lines`.
   - Pte. Compra u otros gastos se muestra en rojo y su globo de detalle abre tabla con líneas, no solo total.
   - Donados y TKxx también abren tabla con detalle cuando existe.

2. Visor de ticket ampliado
   - El botón Cerrar queda abajo a la derecha mediante CSS, para evitar pulsar cerca de Salir de la app.

3. Avance del evento desde logo ColtyLAB
   - Sin autocierre por tiempo.
   - Sin cierre por scroll ni clic fuera.
   - Se mantiene visible hasta volver a pulsar el logo ColtyLAB, cerrar con X o Escape.

