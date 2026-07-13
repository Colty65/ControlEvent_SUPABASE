# ControlEvent v20_prod FIX5 - Vista gráfica Mapa de recursos

Aplicado sobre `CE_v19_PROD_MAPA_GLOBAL_FIX4.zip`.

## Cambios

- `COMPRAS + DONACIONES` se sustituye visualmente por `PRODUCTO DISPONIBLE`.
- En INGRESOS se añade botón `Ver todo` para listar todos los registros de ingresos.
- Queso de INGRESOS reforzado para iPad/móvil:
  - se quita el foco/cuadro negro al tocar la porción,
  - se añade detección robusta de porción/leyenda mediante búsqueda manual del elemento padre.
- RadioButton de SEGMENTO/DESTINO:
  - más pequeños,
  - texto más compacto,
  - protegido contra selección accidental durante scroll táctil en iPad/móvil.
- Colores reforzados con prioridad:
  - leyendas del queso con el mismo color que cada porción,
  - registros de INGRESOS pintados con el color de su porción/leyenda,
  - PRODUCTO DISPONIBLE: rojo Pte.Compra, verde TK/Gastos Corrientes, donaciones en colores de donación.
- Cabeceras de tablas de INGRESOS y PRODUCTO DISPONIBLE con fondo gris claro y letra algo mayor.
- Estado del evento en cabecera con color forzado:
  - En curso: verde,
  - Finalizado: rojo.
- Donaciones: el campo `Tienda` se muestra vacío/guion. Si una tienda dona, debe figurar como `Donante`, no como `Tienda`.
- Cache-bust actualizado en `index.html` y `public/index.html`.

## Archivos modificados

- `public/app/features/v19-mapa-recursos-global.js`
- `app/features/v19-mapa-recursos-global.js`
- `index.html`
- `public/index.html`

## Validación

- `node --check public/app/features/v19-mapa-recursos-global.js`
- `node --check app/features/v19-mapa-recursos-global.js`
