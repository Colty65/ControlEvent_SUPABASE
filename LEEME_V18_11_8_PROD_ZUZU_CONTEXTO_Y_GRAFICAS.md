# ControlEvent v20_prod · Zuzu contexto completo y gráficas útiles

Cambios principales:

- Corregido el caso de preguntas combinadas: datos del evento + socios que no asistirán/no figuran + parte meteorológico.
- Para “socios que no asistirán”, ControlEvent ya no usa los textos entre comillas de exclusión como filtros de persona.
- Se calcula una tabla específica: PERSONAS con rango SOCIO que no figuran en INGRESOS del evento, excluyendo nombres internos tipo `Personas...` y `z_de...` / `z_DEV...`.
- Las preguntas de PERSONAS catálogo ya no roban las consultas mixtas de evento.
- El informe operativo de evento tiene prioridad cuando la pregunta menciona datos del evento, meteo, ingresos o asistencia.
- La meteorología se empaqueta como contexto indirecto visible para Gemini y como tarjeta gráfica meteorológica.
- Para eventos de un solo día ya no se pinta una línea con un punto “en el aire”: se muestra una tarjeta funcional con máxima, mínima, lluvia, viento y cielo.
- Añadida validación de respuesta narrativa truncada o incompleta: si Gemini corta el texto o no contesta todas las partes pedidas, ControlEvent reintenta con una corrección guiada.
- Versión única actualizada a v20_prod.

Validación:

- `node --check services/event-ai.service.js`
- `node --check services/event-context.service.js`
- `node --check public/app/features/v11-3-zuzu-analitica-libre.js`
- `unzip -t` del ZIP final.
