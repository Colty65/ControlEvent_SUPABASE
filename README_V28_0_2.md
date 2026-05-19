# ControlEvent v28.9

Corrección de consistencia de versión frontend/backend tras v28.0.1.

## Cambios

- Unifica versión de backend en `server/paths.js`.
- Unifica versión de BACKUP servidor en `routes/export.routes.js`.
- El BACKUP vuelve a nombrarse con `ControlEvent_v28_9`.
- Mantiene ExcelJS bajo demanda de v28.0.
- Mantiene la corrección de duplicados de v28.0.1.

## Comprobación recomendada

```js
ControlEventDebug.status()
fetch('/api/version').then(r=>r.json()).then(console.log)
ControlEventExcel.info().excelJs
```

El BACKUP debe llamarse `ControlEvent_v28_9_BACKUP_...xlsx`.
