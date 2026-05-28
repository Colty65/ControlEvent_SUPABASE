# ControlEvent v50.24 - Mapa de funciones legacy y duplicados

Versión de análisis seguro posterior a v26.7.

## Objetivo

No cambia la operativa diaria de la app. Añade un mapa estático de funciones, asignaciones globales y duplicados dentro de los bundles legacy para preparar las siguientes fases de limpieza.

## Archivos añadidos

- `public/app/diagnostics/legacy-function-map.json`
- `public/app/diagnostics/legacy-map.js`

## Archivos legacy renombrados para evitar caché

- `public/app/legacy/legacy-bundle-before-modules-v26.9.js`
- `public/app/legacy/legacy-bundle-after-modules-v26.9.js`

Los equivalentes `v26.7` ya no son necesarios si actualizas `index.html` y `sw.js`.

## Métricas del mapa legacy

- Entradas detectadas: 2340
- Nombres únicos: 1001
- Nombres duplicados: 332
- Globales/acciones expuestas: 292
- Candidatos helper duplicados: 246

## Consola del navegador

```js
ControlEventLegacyMap.printSummary()
ControlEventLegacyMap.topDuplicates(25)
await ControlEventLegacyMap.load()
ControlEventLegacyMap.findName('exportExcel')
ControlEventLegacyMap.listDuplicates({ riskIncludes: 'render-ui' })
ControlEventDiagnostics.inspect().modules.legacyMap
```

## Líneas de index.html

- v26.7: 447 líneas
- v26.9: 447 líneas

v26.9 no busca adelgazar `index.html`; busca identificar qué partes del legacy se pueden limpiar en v26.9 y v27.x.
