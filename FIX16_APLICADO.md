# ControlEvent v21_prod · FIX16 aplicado

Corrección sobre FIX15 centrada en estabilidad y en retirar los parches que estaban haciendo pesada la app.

## Cambios

1. Login / selector de eventos
   - Se elimina la carga de `v19-fix14-login-unblock.js` del HTML.
   - Se retiran las precargas repetidas `/api/state?boot=1` que FIX13 lanzaba en arranque/foco/click del selector.
   - El desplegable se reconstruye solo con el estado local ya cargado por el login original.

2. INGRESOS / colaboradores
   - En `v8-5-crud-root-fix28.js`, al modificar un colaborador se usa la fila capturada del formulario como fuente visual inmediata.
   - Se evita usar `result.item` si viene desfasado.
   - Se mantiene la fila modificada como pendiente local durante 30 segundos para que cualquier `/api/state` antiguo no repinte “Pendiente”.
   - Se fuerza el valor visual de los controles de la fila modificada tras el render.

3. Vista aérea
   - Se añade `v19-fix16-prod.js`.
   - Producto y SEGMENTO quedan separados: primera columna más ancha, producto con elipsis y SEGMENTO desplazado a la derecha.
   - Estado activo único: [Ver todo] de INGRESOS, [Ver todo] de PRODUCTO DISPONIBLE o ficha SEG/DEST. Al activar uno se limpian los demás.

4. Descarga de fototickets
   - Se modifica `v10-5-hotfix-fotos-docs-botones.js` para generar nombres tipo:
     `TKxx-Evento-Tienda.jpg`
   - También se añade una normalización de último recurso en `v19-fix16-prod.js` para enlaces con `ticket_TKxx.jpg`.

5. Cache busting
   - HTML actualizado a `v21_prod_20260709194000_FIX16`.

## Verificación

- `node --check` correcto en ficheros JS tocados.
- ZIP validado con `unzip -t`.
