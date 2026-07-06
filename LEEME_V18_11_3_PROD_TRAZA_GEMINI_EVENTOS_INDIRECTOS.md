# ControlEvent v18.11.5_prod · Traza Gemini y eventos indirectos

Esta versión no cambia el objetivo de v18.11: Zuzu/Gemini debe participar siempre en el flujo normal. Añade evidencias visibles para saber exactamente por dónde pasa cada consulta.

## Cambios principales

- Añadida tarjeta **“Trazabilidad del flujo Zuzu”** en cada respuesta.
- La traza muestra: inicio, estado CE, plan local preventivo, Paso 1 Gemini planificador, extracción CE, datos indirectos, Paso 3 Gemini respuesta final, Paso 4 Gemini redacción humana y presentación.
- Si Gemini falla, se ve el motivo técnico real: falta de clave, timeout, HTTP, cuota, JSON inválido, etc.
- CE puede seguir calculando datos de respaldo, pero queda marcado como **respaldo / cálculo local CE** y no como respuesta humana de Gemini.
- Se eliminan restricciones rígidas para consultas indirectas relacionadas con eventos.
- Las preguntas de meteorología/clima/tiempo se permiten si están vinculadas a evento(s); CE intenta enriquecer el contexto con Open-Meteo y lo entrega a Gemini para que lo incorpore a la respuesta.
- Si hay meteorología, CE añade tabla y gráficas de temperatura/lluvia como soporte visual.
- Se mantiene versión única visible: **v18.11.5_prod**.

## Variables opcionales para meteorología

- `CONTROLEVENT_WEATHER_LAT`
- `CONTROLEVENT_WEATHER_LON`
- `CONTROLEVENT_WEATHER_PLACE`

Por defecto usa Villanueva de Bogas, Toledo.

## Validación local realizada

- `node --check services/event-ai.service.js`
- `node --check public/app/features/v11-3-zuzu-analitica-libre.js`
- `node --check app/features/v11-3-zuzu-analitica-libre.js`
- `node --check server/app.js`
- `node --check api/index.js`

La prueba de ejecución directa con `analyzeEventPrompt` no se pudo completar en este contenedor porque faltan dependencias instaladas (`mime-types`), pero la sintaxis de los ficheros modificados queda validada.
