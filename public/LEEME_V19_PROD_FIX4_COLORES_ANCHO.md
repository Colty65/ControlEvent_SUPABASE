# ControlEvent v22_prod - FIX4 Colores y ancho vista gráfica

Cambios aplicados sobre `CE_v19_PROD_MAPA_GLOBAL_FIX3.zip`:

1. Vista gráfica completa del evento:
   - Reforzado el color de texto de los registros de INGRESOS:
     - Verde si el ingreso está realizado.
     - Rojo si está pendiente de ingresar.
   - Reforzado el color de texto de COMPRAS + DONACIONES:
     - Rojo para Pte.Compra.
     - Verde para TKxx / GASTOS CORRIENTES.
     - Tonos de donación para donaciones.
   - Se añaden colores con prioridad alta para que no los pise el CSS general de la app.

2. Ancho de ventana:
   - Ventana global ampliada de `1400px` a `1580px` máximo.
   - Columna izquierda ligeramente reducida.
   - Panel derecho gana anchura útil para que la línea compacta de productos quepa mejor.
   - Tabla de productos ajustada con letra algo más compacta y columnas más equilibradas.

3. Cache:
   - Actualizado cache-bust de `v19-mapa-recursos-global.js`.

Archivos modificados:
- `app/features/v19-mapa-recursos-global.js`
- `public/app/features/v19-mapa-recursos-global.js`
- `index.html`
- `public/index.html`

Validación:
- `node --check app/features/v19-mapa-recursos-global.js`
- `node --check public/app/features/v19-mapa-recursos-global.js`
