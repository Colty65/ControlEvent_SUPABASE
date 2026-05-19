# ControlEvent v28.7 - Consolidación móvil y estado de rendimiento

Versión de consolidación sobre v28.6.1.

## Objetivo

Dejar como configuración estable lo que se ha probado con buen resultado en PC, iPad, Android e iPhone:

- Debug/diagnósticos sólo bajo demanda.
- ExcelJS sólo bajo demanda.
- Hotpath cache activo.
- Screen lazy activo.
- Mantenimiento diferido.
- ActiveRender conservado como herramienta experimental, pero apagado por defecto.

## Nuevo comando

```js
ControlEventPerformanceStatus.print()
ControlEventPerformanceStatus.quick()
ControlEventPerformanceStatus.inspect()
```

## No se toca funcionalmente

- INFOEVENTO
- BACKUP
- Carga de datos
- Ingresos
- Compras
- Donaciones
- Mantenimiento real
- Tickets/fotos
- Guardado

## Prueba recomendada

```js
ControlEventDebug.status()
ControlEventExcel.info().excelJs.loaded
ControlEventActiveRender.print()
ControlEventPerformanceStatus.print()
```

Esperado:

- `ControlEvent v28.7`
- `ExcelJS loaded: false` al inicio
- `ActiveRender enabled: false`
- rendimiento en modo `production-lite` salvo que se active debug.
