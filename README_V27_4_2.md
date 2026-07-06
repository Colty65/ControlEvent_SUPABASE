# ControlEvent v16_prod

Corrección menor sobre v27.4.1 para eliminar errores 404 de ExcelJS en producción al usar las herramientas standalone de RESUMEN_MODULAR y GRAFICAS_MODULAR.

## Cambios

- Se añade `public/vendor/exceljs.min.js` como copia local del motor ExcelJS.
- El endpoint `/vendor/exceljs.min.js` comprueba primero `public/vendor/exceljs.min.js` y después `node_modules/exceljs/dist/exceljs.min.js`.
- El runtime Excel intenta cargar primero `/vendor/exceljs.min.js`.
- Se renombraron los bundles legacy a v27.4.2 para evitar caché.

## Pruebas recomendadas

```js
ControlEventGraficasSheet.downloadStandalone().then(console.log).catch(console.error)
ControlEventResumenSheet.downloadStandalone().then(console.log).catch(console.error)
```

También generar INFOEVENTO y comprobar que se mantienen RESUMEN_MODULAR y GRAFICAS_MODULAR.
