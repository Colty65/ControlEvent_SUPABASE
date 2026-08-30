# ControlEvent v4_0_exp · VNext P1.4 · Peña Friend + Compare Charts

P1.4 conserva el fast path de P1.3 y sube un nivel la conversación oral: Zuzu habla desde la posición de un amigo de la Peña, no como un lector de columnas. La pantalla conserva precisión y la voz puede usar Nombre hablado, motes, asistencia, estado de ingreso y Nombre hablado del evento para construir frases sociales sin una segunda llamada IA.

## Cambios

- `person_income_status` cruza ingreso + asistencia canónica en paralelo.
- Nueva operación `person_event_status` para preguntas sociales amplias sobre una persona en un evento.
- Si una persona no asiste y su compañero/a sí, la respuesta puede decirlo directamente.
- Alias con una errata mínima inequívoca se resuelven sin hard-code de nombres concretos.
- `tone=friendly|banter|neutral` permite que Gemini marque el tono sin que CE tenga que interpretar palabras coloquiales.
- `compare_events` acepta `chart`, `chart_type` y `metric`; las gráficas se crean localmente sin nueva IA.
- El contexto de comparación conserva la lista completa de eventos, métrica y tipo de gráfica.
- La memoria puede inspeccionar si las coincidencias mencionan visiblemente un nombre o son solo relacionadas.
- Se mantiene la carga Gemini/Supabase en paralelo y una sola Interaction en consultas factuales normales.
