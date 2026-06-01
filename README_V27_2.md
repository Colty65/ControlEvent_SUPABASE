# ControlEvent v50.24

Fase segura de modularización Excel: RESUMEN ya tiene escritor ExcelJS modular real en `public/modules/excel/resumen-sheet.js`.

## Qué cambia

- Se mantiene el motor legacy estable para generar INFOEVENTO completo.
- Se añade escritura modular de una hoja RESUMEN independiente mediante `ControlEventResumenSheet.writeWorksheet()`.
- Se añade prueba manual de descarga independiente: `ControlEventResumenSheet.downloadStandalone()`.
- Se captura snapshot antes de INFOEVENTO como en v27.1, pero ahora el módulo también sabe escribir una hoja Excel real.

## Comprobaciones recomendadas

```js
ControlEventResumenSheet.assertReady()
ControlEventResumenSheet.preview()
await ControlEventResumenSheet.downloadStandalone()
ControlEventExcel.info()
```

La descarga normal INFOEVENTO y BACKUP deben seguir funcionando como en v27.0.2/v27.1.

## Versiones

- Interfaz: `ControlEvent v50.24`
- INFOEVENTO: `ControlEvent_v50_24_INFOEVENTO-...xlsx`
- BACKUP: `ControlEvent_v50_24_BACKUP_TODOS_...xlsx`
- Cache PWA: `controlevent-shell-v50-24`
