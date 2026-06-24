# ControlEvent v15_prod

Versión funcional construida sobre la V29.4 estable de rendimiento.

## Novedad principal

Se añade una nueva opción de menú visible para todos los niveles de usuario:

- **Mapa de productos**

La pantalla cruza la información de **Compras** y **Donaciones de producto** para ver la necesidad del evento por **Tienda + Producto**.

## Comportamiento de Mapa de productos

- Lista las compras agrupadas por **Tienda + Producto**.
- Para cada producto muestra:
  - unidades a comprar;
  - importe previsto de compra;
  - necesidad total del evento, sumando compra + donación;
  - unidades y valor donados;
  - ticket/estado y responsable;
  - donantes del producto colocados justo debajo.
- Si hay productos donados sin compra planificada, aparecen en un bloque separado al final.
- La vista es informativa: no modifica compras ni donaciones.

## Rendimiento

Se conserva la base técnica de la V29.4:

- modo LITE/turbo en iPad y Android;
- primer pintado completo controlado tras login y cambio de evento;
- sin indicador LITE visible en uso normal;
- diagnóstico disponible con `?ceDiag=1`.

## Archivos nuevos o modificados relevantes

- `public/index.html`
- `public/app/features/mapa-productos.js`
- `public/modules/views/mapa-productos.js`
- `public/modules/menu-registry.js`
- `public/app/styles/app.css`
- `public/app/performance/low-resource-legacy-patch.js`
- `public/app/performance/mobile-lite.js`
- `public/app/performance/active-render.js`
- `public/sw.js`
