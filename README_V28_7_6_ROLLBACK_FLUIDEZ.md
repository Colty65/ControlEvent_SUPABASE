# ControlEvent v28.7.6 - recuperación de fluidez móvil

Esta versión se ha generado desde la base v28.6.1, que fue la última confirmada como fluida.

No depende de borrar archivos antiguos: el index carga bundles nuevos con nombre v28.7.6.

Prueba recomendada en incógnito:
```js
ControlEventDebug.status()
ControlEventActiveRender.print()
ControlEventExcel.info().excelJs.loaded
```

Esperado:
- ControlEvent v28.7.6
- ActiveRender enabled: false
- ExcelJS loaded: false antes de generar INFOEVENTO.
