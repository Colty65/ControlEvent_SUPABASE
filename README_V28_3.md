# ControlEvent v50.24 - Diagnóstico de peso legacy

Versión conservadora orientada a preparar la limpieza real del bundle legacy sin tocar la operativa.

## Nuevo diagnóstico

Disponible sólo cuando se activa debug:

```js
await ControlEventDebug.enable()
ControlEventLegacyWeight.print()
ControlEventLegacyWeight.quick()
ControlEventLegacyWeight.inspect()
```

Mide:

- tamaño de los bundles legacy actuales
- líneas aproximadas
- bloques históricos extraídos
- declaraciones de funciones
- asignaciones globales `window.*`
- duplicados de nombres detectables por texto
- recomendaciones para limpiar sin romper

## No se toca

- INFOEVENTO
- BACKUP
- Carga de datos
- ExcelJS bajo demanda
- Mantenimiento diferido
- Ingresos / Compras / Donaciones
- Guardado

## Objetivo

Antes de empezar a eliminar legacy, medir qué pesa y dónde está el riesgo.
