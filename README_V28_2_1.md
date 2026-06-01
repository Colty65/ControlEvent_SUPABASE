# ControlEvent v5.1.0_prod - Corrección proxy de mantenimiento diferido

Corrección pequeña sobre v28.2.

## Problema corregido

En modo carga diferida, `ControlEventMaintenance` no existía hasta abrir la pantalla de Mantenimiento. Si se ejecutaba en consola:

```js
ControlEventMaintenance.print()
```

aparecía `ReferenceError`.

## Solución

Se añade un proxy ligero instalado al arranque:

```js
ControlEventMaintenance.print()
await ControlEventMaintenance.ensure()
await ControlEventMaintenance.loadAndPrint()
```

El módulo real de mantenimiento sigue cargando bajo demanda, por lo que se mantiene la mejora móvil.

## No se toca

- INFOEVENTO
- BACKUP
- Carga de datos
- Ingresos / Compras / Donaciones
- Guardado
- ExcelJS bajo demanda
