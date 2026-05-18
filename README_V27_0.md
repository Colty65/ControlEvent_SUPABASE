# ControlEvent v27.0 - Excel modular public facade

Esta versión inicia la extracción real de Excel del legacy sin cambiar el motor estable de generación.

## Cambio principal

Las llamadas públicas:

- `window.exportExcel()`
- `window.exportSeedWorkbook()`

ya no apuntan directamente al legacy. Ahora pasan por `ControlEventExcel` y desde ahí se invoca el motor legacy capturado.

Esto permite que botones, menús móviles y llamadas antiguas sigan funcionando, pero con un punto de control modular único.

## Estado de seguridad

- INFOEVENTO mantiene el motor legacy final como backend estable.
- Backup mantiene el motor legacy final como backend estable.
- Se evita doble clic/ejecución simultánea por acción.
- Se registran eventos `controlevent:excel-before-run`, `controlevent:excel-after-run` y `controlevent:excel-error`.

## Pruebas de consola

```js
ControlEventExcel.info()
ControlEventExcel.assertReady()
await ControlEventExcel.run('exportExcel')
await ControlEventExcel.run('exportSeedWorkbook')
ControlEventDiagnostics.inspect().modules.excel
```

## Métricas index.html

- v26.9: 447 líneas.
- v27.0: 447 líneas.
- Diferencia: 0 líneas.

Esta versión no adelgaza el HTML; cambia propiedad funcional: Excel queda gobernado por módulo.
