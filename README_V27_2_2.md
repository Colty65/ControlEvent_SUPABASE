# ControlEvent v5.1.0_prod - Corrección definitiva Precio referencia en carga BACKUP

Versión correctiva sobre v27.2.1.

## Problema detectado

v27.2.1 corrigió una ruta antigua de importación, pero la app estaba usando la ruta activa `importV92Workbook()`. Esa ruta importaba PRODUCTOS con nombre, segmento y destino, pero no copiaba el campo de precio referencia.

Por eso el BACKUP podía traer `PRODUCTO_PRECIO` o `PRODUCTO_PRECIO_REFERENCIA`, pero en Mantenimiento → PRODUCTOS aparecía siempre `0,00 €`.

## Corrección

Ahora `importV92Workbook()` lee el precio de referencia desde cualquiera de estas cabeceras:

- `PRODUCTO_PRECIO_REFERENCIA`
- `PRODUCTO_PRECIO`
- `PRECIO_REFERENCIA`
- `PRECIO_REF`
- `PRECIO`
- `PVP`
- `IMPORTE_REFERENCIA`

Y lo guarda en:

- `precio`
- `defaultPrecio`

Además se añade una normalización defensiva justo antes de asignar `state.productos`.

## Diagnóstico

Después de cargar un BACKUP, en consola:

```js
ControlEventImportPriceDiagnostics.print()
ControlEventImportPriceDiagnostics.find('zzzz')
```

El producto de prueba `zzzzzzzzzz` debería mostrar `225.23` en `defaultPrecio` / `precioReferencia`.
