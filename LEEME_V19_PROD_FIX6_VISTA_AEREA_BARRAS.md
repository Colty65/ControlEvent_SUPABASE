# ControlEvent v22_prod - FIX6 Vista aérea / barras

Partiendo del ZIP anterior `CE_v19_PROD_MAPA_GLOBAL_FIX5.zip`.

Cambios aplicados:

- Título de la ventana cambiado a **Vista aérea**.
- Título/nombre del evento coloreado por estado:
  - En curso: verde.
  - Finalizado: rojo.
- Sustituidos los RadioButton de Segmento/Destino por una gráfica de barras:
  - 3 barras de Segmento: Comida, Bebida, Infraestructura.
  - 5 barras de Destino: Aperitivo, Comida, Cubatas, Cena, Infraestructura.
  - Cada barra muestra total, compras, donado y número de registros.
  - Al pulsar una barra, se filtra el detalle de registros.
- Se mantiene botón **Ver todo** en Producto Disponible para volver a listar todos los productos.
- Al pulsar porciones del queso de Ingresos o barras de Producto Disponible, la ventana desplaza automáticamente a la zona de registros en iPad/móvil y también fuerza visibilidad del detalle.
- Añadidas fichas superiores:
  - Saldo Actual = ingresos realizados - gastos realizados.
  - Saldo Operativo = ingresos totales - gastos previstos.
- Orden de fichas superiores:
  - Ingresos, Compras, Saldo Actual, Saldo Operativo, Donaciones, Producto Disponible.
- Fichas superiores pintadas según tradición visual de la app.
- Cabeceras de registros de Ingresos y Producto Disponible con fondo gris claro y letra algo mayor.
- Cache-bust actualizado a `v22_prod_20260709001000_FIX6`.

Validación realizada:

- `node --check public/app/features/v19-mapa-recursos-global.js`
