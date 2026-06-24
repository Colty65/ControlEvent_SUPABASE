# ControlEvent v15_prod - Ajuste diagnóstico mantenimiento

Versión correctiva conservadora.

## Objetivo

Corrige el falso aviso del diagnóstico de IMPORTACIÓN cuando `clearImportStatus` no está expuesta como función global.

## No se toca funcionalmente

- INFOEVENTO
- BACKUP / descarga de datos
- carga de datos
- ingresos/compras/donaciones
- mantenimiento real
- tickets/fotos
- guardado

## Prueba recomendada

```js
ControlEventMaintenanceDiagnostics.print()
```

La sección IMPORTACIÓN debe aparecer como OK si la estructura existe. Si `clearImportStatus` no está expuesta, se informará sólo como nota opcional, no como problema estructural.
