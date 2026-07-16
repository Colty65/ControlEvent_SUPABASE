# ControlEvent v18.11.1_prod · HOTFIX 404 Vercel

Corrección urgente sobre v18.11_prod.

## Problema observado
Al desplegar la versión anterior en Vercel podía aparecer una pantalla:

`404: NOT_FOUND`

## Causa probable
La versión anterior dejaba a Vercel decidir entre servir estático desde raíz/public o pasar por el backend Express. En algunas configuraciones de proyecto esto puede dejar la raíz sin ruta válida aunque el código esté dentro del ZIP.

## Cambio aplicado
- `vercel.json` ahora enruta explícitamente toda la app a `api/index.js`.
- Express sirve `public/index.html`, assets, módulos y API desde una única entrada.
- Se incluye `public/**` dentro del bundle serverless para que los assets estén disponibles también cuando la app entra por la función.
- Se mantiene `/api/*` y `/vendor/exceljs.min.js` funcionando por la misma entrada.
- Versión visible actualizada a `v18.11.1_prod`.

## Lo que NO cambia
- Se mantiene el flujo de v18.11:
  usuario → Gemini planifica módulos → ControlEvent extrae datos → Gemini redacta/contextualiza → ControlEvent presenta.
- Se mantienen las mejoras de PDF, tablas, gráficos y nombres de archivo.

## Validaciones realizadas
- `node --check server/app.js`
- `node --check api/index.js`
- `node --check services/event-ai.service.js`
- `node --check public/app/features/v11-3-zuzu-analitica-libre.js`
- Comprobación del ZIP con `unzip -t`.
