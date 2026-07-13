# ControlEvent v20_prod · Zuzu con tokens optimizados

Versión centrada en mantener el flujo completo con Gemini, pero reduciendo tokens inútiles y dejando la traza más limpia.

## Flujo mantenido

1. El usuario escribe el prompt.
2. Gemini interpreta intención, módulos, filtros, eventos y salidas deseadas.
3. ControlEvent extrae y cocina los datos reales.
4. Gemini redacta/contextualiza la respuesta final con el tono solicitado.
5. ControlEvent presenta la respuesta, gráficas, tablas, anexos y PDF.

## Cambios principales

- Paso 1 de Gemini convertido en planificador ultraligero: recibe solo catálogo mínimo, eventos y candidatos por prompt, no compras/donaciones/tablas completas.
- Paso 1 limitado con `maxOutputTokens` bajo y salida JSON estricta.
- Paso 4 recibe resumen cocinado por CE + ejemplos representativos, no todo el anexo completo.
- Las tablas completas siguen apareciendo en pantalla/PDF como anexo generado por CE, pero no se mandan enteras a Gemini salvo necesidad.
- Añadida estimación local de caracteres/tokens antes de llamar a Gemini, visible en la traza.
- La traza queda plegada por defecto para no invadir la respuesta.
- Se permite preguntar por información indirecta ligada a eventos, como tiempo/clima/previsión, sin bloquear la consulta.
- Versionado único actualizado a `v20_prod` y cache-busting nuevo.

## Validaciones realizadas

- `node --check services/event-ai.service.js`
- `node --check services/event-context.service.js`
- `node --check public/app/features/v11-3-zuzu-analitica-libre.js`
- `node --check public/app/features/v18-11-6-version-trace.js`
- `node --check server/app.js`
- `node --check api/index.js`
- Parseo JSON de `package.json` y `package-lock.json`
- Búsqueda de versiones antiguas en archivos funcionales
- `unzip -t` del ZIP final

## Nota

La traza seguirá mostrando tokens reales cuando Gemini los devuelva en `usageMetadata`. La estimación previa es solo orientativa para ver si el contexto que se manda al modelo se está compactando como esperamos.
