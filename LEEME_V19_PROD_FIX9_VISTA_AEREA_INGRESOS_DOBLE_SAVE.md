# ControlEvent v22_prod FIX9 - Vista aérea + modificación ingresos

Partiendo de CE_v19_PROD_MAPA_GLOBAL_FIX8.zip.

Cambios:
- Vista aérea: añadida casita flotante para volver a la cabecera de la ventana.
- Vista aérea: reforzado el color de fondo de las 6 fichas superiores:
  - INGRESOS azul.
  - COMPRAS rojo.
  - SALDO ACTUAL verde si positivo / rojo si negativo.
  - SALDO OPERATIVO azul si positivo / rojo si negativo.
  - DONACIONES naranja/amarillo.
  - PRODUCTO DISPONIBLE verde/agua.
- Ingresos: corregida lectura del registro visible al pulsar Modificar, especialmente el desplegable Situación, para evitar tener que guardar dos veces.
- Ingresos: tras guardar, si el refresco devuelve una copia antigua, se mantiene localmente la fila guardada y se re-renderiza.
- No se ha tocado lógica de compras/donaciones/eventos.

Validación:
- node --check public/app/features/v19-mapa-recursos-global.js
- node --check public/app/features/v8-5-crud-root-fix28.js
