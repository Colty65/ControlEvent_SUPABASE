# ControlEvent v5.1.0_prod

Versión preparada a partir de `ControlEvent_SUPABASE-main_V33_7.zip`, que es la versión real actualmente desplegada.

## Cambios incluidos

1. PANEL DE RECURSOS / Mapa de productos
   - Las donaciones de un producto con necesidad de compra se muestran asociadas solo a la primera ficha de compra de ese producto.
   - Esas donaciones ya no se repiten en las fichas posteriores del mismo producto ni en el bloque final.
   - El bloque final queda limitado a producto donado sin necesidad de compra y usa la cabecera: `MAS PRODUCTO DONADO FUERA DE NECESIDAD DE COMPRA`.
   - Las fichas de donación incluyen botón para marcar/desmarcar `Entregado`.

2. COMPRAS
   - La duplicidad pasa a controlarse por `Producto + Tienda + Ticket`.
   - Se permite comprar el mismo producto en la misma tienda si el ticket es diferente.
   - Si coinciden producto, tienda y ticket, se avisa y se posiciona el registro existente.

3. MANTENIMIENTOS
   - Botón flotante para subir arriba en PERSONAS, TIENDAS y PRODUCTOS.

4. EXPORTACIONES
   - Nuevo correctivo para INFOEVENTO evitando el error `RangeError: Maximum call stack size exceeded`.
   - Nuevo correctivo para Descarga de datos / Backup, con selector para `TODOS` o evento concreto.
   - El backup incluye hoja `JSON_COMPLETO` para conservar todos los campos aunque no estén tabulados.

## Archivos principales tocados

- `public/app/version.js`
- `public/index.html`
- `public/sw.js`
- `public/app/features/mapa-productos.js`
- `public/app/features/v40-fixes.js`
- `package.json`

## Comprobación realizada

- `node --check public/app/features/mapa-productos.js`
- `node --check public/app/features/v40-fixes.js`
