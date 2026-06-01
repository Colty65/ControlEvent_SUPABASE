# ControlEvent v5.1.0_prod

Versión enfocada a rendimiento en iPad/Android modestos.

## Qué corrige respecto a v29.1

En v29.1 se veía que `LITE ON` se activaba, pero parte del código legacy seguía llamando al `render()` interno original. Eso hacía que el modo ligero evitase algunos renders ocultos, pero no todos los repintados globales.

En v29.2 se añade un parche clásico posterior al legacy (`low-resource-legacy-patch.js`) que sí puede sustituir el `render` heredado usado internamente.

## Indicador

En iPad/Android debe aparecer:

`⚡ LITE ON · ocultos N · turbo`

- `ocultos N`: renders de pantallas ocultas evitados.
- `turbo`: está activo el recorte nuevo del render legacy.

En PC/iPhone el botón ya no aparece salvo que se fuerce con `?ceDiag=1`.

## Pruebas rápidas

- Forzar modo ligero: `?ceLite=1`
- Desactivar modo ligero: `?ceLite=0`
- Mostrar diagnóstico aunque esté OFF: `?ceDiag=1`

## Archivos relevantes

- `public/app/performance/low-resource-boot.js`
- `public/app/performance/low-resource-legacy-patch.js`
- `public/app/performance/mobile-lite.js`
- `public/sw.js`
