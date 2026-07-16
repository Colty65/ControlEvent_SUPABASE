# FIX18 aplicado sobre FIX17

Cambios limitados:

1. Vista aérea
   - Se corrige el cálculo de compras para que las líneas de descuento/importe negativo no se conviertan en 0 €.
   - La selección visual queda en una sola opción activa: Ver todo de INGRESOS, Ver todo de PRODUCTO DISPONIBLE o una ficha SEG/DEST.
   - La tabla PRODUCTO DISPONIBLE se estrecha para evitar barra horizontal manteniendo el tamaño de letra.
   - Se oculta el botón Limpiar.

2. Selector de eventos
   - Se reconstruye ordenado por fecha de inicio.
   - Eventos En curso en verde y Finalizados en rojo.

3. Zuzu
   - La extracción del módulo EVENTOS incorpora el campo Descripción de ce_eventos.
   - Las instrucciones de Zuzu indican usar esa Descripción para entender el objetivo del evento y enriquecer informes.

4. UI
   - Se oculta la versión flotante/duplicada de cabecera.

No se han tocado login, mantenimiento de ingresos ni nombres de descarga.
