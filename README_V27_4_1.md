# ControlEvent v15_prod

Corrección menor sobre v27.4.

## Objetivo

La app v27.4 funciona correctamente, pero al ejecutar desde consola:

```js
ControlEventGraficasSheet.downloadStandalone()
```

podía aparecer:

```text
ExcelJS no está disponible para generar GRAFICAS modular.
```

La v27.4.1 añade un cargador robusto de ExcelJS en el runtime modular de Excel.

## Cambios

- `public/modules/excel/_excel-runtime.js` exporta `ensureExcelJS()`.
- `resumen-sheet.js` y `graficas-sheet.js` usan ese cargador para descargas standalone.
- `backup.js` usa el mismo cargador como fallback cliente.
- Se renombran los bundles legacy a v27.4.1 para evitar caché.

## Prueba recomendada

En producción o localhost:

```js
ControlEventGraficasSheet.downloadStandalone()
  .then(console.log)
  .catch(console.error)
```

También:

```js
ControlEventResumenSheet.downloadStandalone()
  .then(console.log)
  .catch(console.error)
```

El INFOEVENTO normal no queda afectado.
