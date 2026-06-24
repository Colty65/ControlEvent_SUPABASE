# ControlEvent v15_prod - Integridad de datos y estabilización post-Excel

Versión conservadora posterior a v27.4.8.

## Objetivo

- No tocar funcionalmente INFOEVENTO, que queda congelado como exportación fiable.
- Mantener desactivadas las descargas standalone modulares de RESUMEN/GRAFICAS.
- Añadir diagnóstico de integridad de datos para revisar BACKUP/carga, precios de referencia, huérfanos y duplicados antes de seguir modularizando.

## Nuevo diagnóstico

En consola:

```js
ControlEventDataIntegrity.print()
ControlEventDataIntegrity.inspect()
ControlEventDataIntegrity.backupReadiness()
ControlEventDataIntegrity.productPrices()
ControlEventDataIntegrity.findProduct('zzzz')
```

## Resultado esperado

La app debe seguir funcionando igual que v27.4.8. Esta versión sólo añade herramientas de control y cambia versión/cache.
