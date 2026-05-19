# ControlEvent v28.7.6 - Rollback real a base fluida v28.6.1

Esta version se genera desde la base funcional v28.6.1, confirmada como fluida, actualizando solo nombres/versiones/cache.

No incorpora los experimentos posteriores v28.7.x que empeoraron iPad/Android.

Configuracion esperada:
- ExcelJS bajo demanda.
- Debug bajo demanda.
- ActiveRender disponible pero desactivado por defecto.
- ScreenLazy y mantenimiento diferido como en v28.6.1.

Prueba:
```js
ControlEventDebug.status()
ControlEventActiveRender.print()
ControlEventExcel.info().excelJs.loaded
```

Esperado:
- ControlEvent v28.7.6
- ActiveRender enabled: false
- ExcelJS loaded: false antes de generar Excel.
