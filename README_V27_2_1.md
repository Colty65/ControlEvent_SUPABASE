# ControlEvent v50.24 - Corrección carga BACKUP precio referencia PRODUCTOS

Versión correctiva sobre v27.2.

## Corrección principal

Se corrige la importación/carga de BACKUP para que la hoja PRODUCTOS conserve el campo **Precio referencia**.

Cambios técnicos:

- `importInitialWorkbook()` acepta más alias de columna:
  - `PRODUCTO_PRECIO_REFERENCIA`
  - `PRODUCTO_PRECIO`
  - `PRECIO_REFERENCIA`
  - `PRECIO_REF`
  - `PRECIO`
  - `PVP`
  - `IMPORTE_REFERENCIA`
- Al importar productos, se rellenan tanto `precio` como `defaultPrecio`.
- `mergeLoadedState()` ya no elimina el precio de referencia al recargar estado desde servidor/localStorage.
- El BACKUP exporta la columna como `PRODUCTO_PRECIO_REFERENCIA` para dejar claro el significado.

## Diagnóstico en consola

Después de cargar/importar datos:

```js
ControlEventImportPriceDiagnostics.print()
```

Debe mostrar cuántos productos tienen precio de referencia mayor que cero.

## Prueba recomendada

1. Generar BACKUP con productos que tengan precio referencia.
2. Cargar ese BACKUP.
3. Ir a Mantenimiento → PRODUCTOS.
4. Comprobar que el Precio referencia no queda a 0,00 €.
5. Ejecutar en consola: `ControlEventImportPriceDiagnostics.print()`.

## Mantiene

- RESUMEN modular standalone de v27.2.
- INFOEVENTO estable.
- BACKUP servidor funcionando.
