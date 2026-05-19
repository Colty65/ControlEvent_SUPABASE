# ControlEvent v28.7.1

Versión de rollback de rendimiento sobre v28.7.

Se conserva el comportamiento fluido confirmado en v28.6.1, con versión actualizada a v28.7.1.

## Cambios

- Se retira del arranque el módulo experimental `public/app/performance/status.js` introducido en v28.7.
- Se mantiene `ActiveRender` disponible pero desactivado por defecto.
- Se mantiene ExcelJS bajo demanda.
- Se mantiene Hotpath cache, ScreenLazy y mantenimiento diferido.
- No se toca INFOEVENTO, BACKUP, carga de datos ni guardado.

## Comprobación

```js
ControlEventDebug.status()
ControlEventExcel.info().excelJs.loaded
ControlEventActiveRender.print()
```

Esperado: versión v28.7.1, ExcelJS sin cargar al inicio y ActiveRender desactivado.
