# ControlEvent v28.7.3

Versión correctiva de rendimiento móvil.

- Hotpath queda disponible pero desactivado por defecto para evitar sobrecoste en iPad/Android.
- ActiveRender sigue disponible pero apagado.
- ExcelJS sigue bajo demanda.
- No se toca funcionalmente INFOEVENTO, BACKUP ni carga de datos.

Prueba recomendada sin debug/consola abierta:
PC, iPad, Android TCL30 e iPhone.

Comandos:

```js
ControlEventDebug.status()
ControlEventExcel.info().excelJs.loaded
ControlEventHotpath.print()
ControlEventActiveRender.print()
```

Esperado:
- ExcelJS loaded: false antes de exportar Excel.
- Hotpath enabled: false por defecto.
- ActiveRender enabled: false por defecto.
