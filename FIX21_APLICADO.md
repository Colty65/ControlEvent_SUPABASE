# FIX21 aplicado sobre FIX20

Cambios mínimos:

1. Mapa de recursos / ventana de producto disponible normal:
   - Las líneas de descuento, abono, devolución, bonificación, rebaja, DTO o rappel ya no se calculan como 0 €.
   - Si la línea trae `precio` negativo o `importe`/`total` negativo, se conserva el valor negativo para compras, necesidad y saldos derivados.

2. Zuzu:
   - Se mantiene el uso del campo `Descripción` de `ce_eventos` ya incorporado en FIX20 para enriquecer informes.

3. Entrada desde login:
   - Se reducen observadores DOM globales de FIX15/FIX16. Ahora no vigilan todo `document.body`; se enganchan solo a la ventana de Vista aérea cuando existe.
   - No se toca el flujo de login ni se añaden precargas.

No tocado: ingresos, descargas, selector, Zuzu backend salvo mantener FIX20, cálculos de Vista aérea ya corregidos.
