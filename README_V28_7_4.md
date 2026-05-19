# ControlEvent v28.7.4

Rollback real de rendimiento móvil basado en la v28.6.1, que fue la última versión confirmada como fluida en PC, iPhone, iPad y Android.

## Objetivo

- Mantener la numeración actualizada.
- Volver al comportamiento práctico de v28.6.1.
- No tocar INFOEVENTO, BACKUP, carga de datos ni operativa real.

## Estado esperado

- ExcelJS bajo demanda.
- Debug bajo demanda.
- Hotpath cache en el mismo estado funcional que v28.6.1.
- ActiveRender disponible, pero apagado por defecto.
- Sin PerformanceStatus en arranque.

## Prueba recomendada

```js
ControlEventDebug.status()
ControlEventExcel.info().excelJs.loaded
ControlEventActiveRender.print()
```

Luego probar fluidez real sin consola/debug abiertos.
