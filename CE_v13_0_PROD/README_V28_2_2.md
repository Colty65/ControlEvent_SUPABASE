# ControlEvent v5.1.0_prod - Corrección API real de mantenimiento diferido

Corrección pequeña sobre v28.2.2.

## Problema corregido

Tras ejecutar:

```js
await ControlEventMaintenance.ensure()
```

el proxy ligero era sustituido por el módulo real de mantenimiento. El módulo real funcionaba, pero no exponía el helper:

```js
ControlEventMaintenance.loadAndPrint()
```

por eso la consola mostraba `loadAndPrint is not a function`.

## Solución

Ahora el API real de mantenimiento también expone:

```js
await ControlEventMaintenance.ensure()
await ControlEventMaintenance.load()
await ControlEventMaintenance.loadAndPrint()
ControlEventMaintenance.print()
```

La mejora de carga diferida se mantiene.

## No se toca

- INFOEVENTO
- BACKUP
- Carga de datos
- Ingresos / Compras / Donaciones
- Guardado
- ExcelJS bajo demanda
