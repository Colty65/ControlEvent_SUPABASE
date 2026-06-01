# ControlEvent v50.24 - Bundle legacy y reducción de peticiones

Versión de optimización posterior a v26.6.

## Objetivo

Reducir peticiones y archivos legacy sin cambiar la lógica funcional.

## Cambios principales

- `index.html` pasa de cargar 63 scripts legacy individuales a cargar 2 bundles legacy.
- Se mantiene `module-loader.js` en la misma posición relativa que tenía en v26.6.
- Se eliminan del paquete los `legacy-inline-*.js` individuales porque ya quedan agrupados.
- Se actualiza la caché PWA a `controlevent-shell-v50-24`.

## Métricas

- Líneas `index.html` v26.6: 570
- Líneas `index.html` v26.9: 447
- Reducción: 123
- Scripts legacy v26.6: 63
- Bundles legacy v26.9: 2
- Peticiones legacy reducidas: 61

## Archivos nuevos clave

- `public/app/legacy/legacy-bundle-before-modules-v26.9.js`
- `public/app/legacy/legacy-bundle-after-modules-v26.9.js`
- `README_V26_9_LEGACY_BUNDLES.json`

## Prueba recomendada

```powershell
npm run dev:supabase
```

Abrir `http://localhost:3030` y comprobar login, eventos, ingresos, compras, donaciones, resumen, mantenimiento, tickets e INFOEVENTO.
