# ControlEvent v19_prod - FIX7 Vista aérea

Cambios aplicados sobre `CE_v19_PROD_MAPA_GLOBAL_FIX6.zip`:

- iPad/móviles: activación por doble toque rápido en:
  - porciones del queso de INGRESOS,
  - leyendas del queso de INGRESOS,
  - barras de PRODUCTO DISPONIBLE.
- PC: al pulsar porciones, leyendas o barras no se desplaza la ventana automáticamente.
- Barras de PRODUCTO DISPONIBLE más vistosas:
  - segmentos con acento azul,
  - destinos con acento morado,
  - barras internas con compras en rojo y donaciones en naranja/amarillo.
- Fichas superiores de cabecera con fondos de color según la tradición visual de la app:
  - ingresos azul,
  - compras rojo,
  - saldos verde/azul o rojo si son negativos,
  - donaciones naranja,
  - producto disponible verde/agua.
- Botón `Ver todo` de PRODUCTO DISPONIBLE situado arriba de la ficha, antes de la primera barra `SEG COMIDA`.
- Cache-bust actualizado a `FIX7` en `index.html` y `public/index.html`.

Validación:

- `node --check public/app/features/v19-mapa-recursos-global.js`
- `node --check app/features/v19-mapa-recursos-global.js`
