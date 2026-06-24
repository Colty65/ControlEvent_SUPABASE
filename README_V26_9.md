# ControlEvent v15_prod - Limpieza segura del legacy

Versión de continuidad sobre v26.8.

## Objetivo

Primera limpieza segura del legacy: la app sigue usando 2 bundles activos, pero se documentan y verifican los restos que ya no deben cargarse ni mantenerse en el repositorio.

## Cambios

- Versión visual y PWA: `ControlEvent v15_prod`.
- Cache PWA: `controlevent-shell-v50-24`.
- Bundles legacy activos:
  - `public/app/legacy/legacy-bundle-before-modules-v26.9.js`
  - `public/app/legacy/legacy-bundle-after-modules-v26.9.js`
- Nuevo diagnóstico:
  - `public/app/diagnostics/legacy-cleanup.js`
  - `public/app/diagnostics/legacy-cleanup-report.json`

## Comprobación en consola

```js
ControlEventLegacyCleanup.assertClean()
await ControlEventLegacyCleanup.print()
await ControlEventLegacyCleanup.obsoleteFiles()
ControlEventDiagnostics.inspect()
```

## Líneas de index.html

- v26.8: 448 líneas.
- v26.9: 448 líneas.
- Diferencia: 0 líneas.

Esta versión no adelgaza `index.html`; consolida la limpieza previa y prepara la extracción real de Excel en v27.0.

## Archivos antiguos que se pueden borrar del repo

- `public/app/legacy/legacy-bundle-before-modules-v26.8.js`
- `public/app/legacy/legacy-bundle-after-modules-v26.8.js`
- `public/app/legacy/legacy-bundle-before-modules-v26.7.js`
- `public/app/legacy/legacy-bundle-after-modules-v26.7.js`
- `public/app/legacy/legacy-inline-*.js`

Si no existen ya, no hay nada que hacer.
