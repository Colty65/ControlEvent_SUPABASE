# ControlEvent v16_prod

## Objetivo

Primera separación real de Excel hoja a hoja: la hoja `RESUMEN` queda modelada en `public/modules/excel/resumen-sheet.js`.

## Modo seguro

La generación final de INFOEVENTO sigue usando el motor legacy estabilizado, pero antes de lanzar el Excel se captura un modelo modular de RESUMEN:

- evento activo
- panel SOCIOS
- panel DONANTES
- donación de producto
- operativa/saldos

Esto permite validar la hoja RESUMEN antes de sustituir la escritura legacy en la siguiente fase.

## Consola

```js
ControlEventResumenSheet.preview()
ControlEventResumenSheet.assertReady()
ControlEventResumenSheet.getLastSnapshot()
ControlEventExcel.info()
```

## Versiones esperadas

- `ControlEvent v16_prod`
- `ControlEvent_v16_prod_INFOEVENTO-...xlsx`
- `ControlEvent_v16_prod_BACKUP_TODOS_...xlsx`
- cache PWA: `controlevent-shell-v50-24`

## Líneas de index.html

Se mantiene en 447 líneas. Esta versión no adelgaza HTML; empieza a adelgazar la dependencia funcional del legacy Excel.
