# Zuzu Ledger Inmutable · ITV / regresión

La ruta activa de Zuzu guarda cada turno como registro inmutable y separa PLAN, DATASET y VIEW.

## Baterías incluidas

- `zuzu-ledger-technical-battery.json`: 21 preguntas de regresión sobre DATASET/VIEW, cambio de entidades, referencias, campos y gráfica.
- `zuzu-ledger-human-battery.json`: 33 preguntas de conversación humana continua, con pronombres, correcciones, vuelta a asuntos anteriores y referencias vagas.
- `ITV_Zuzu_Bateria_Tecnica_21.xlsx`: la batería técnica lista para cargar directamente desde ITV.
- `ITV_Zuzu_Bateria_Humana_33.xlsx`: la batería humana lista para cargar directamente desde ITV.

Estas baterías son documentación/regresión; no contienen reglas lingüísticas del runtime.

## Excel en ITV

La ITV de Zuzu acepta `.xlsx` / `.xlsm` con una hoja `PREGUNTAS` (o, si no existe, la primera hoja).
La fila 1 debe contener `PREGUNTA` (también admite `PROMPT` / `PREGUNTAS`). Son opcionales:

- `SECUENCIA` / `SEQ`
- `GRUPO`
- `ETIQUETA` / `LABEL`
- `ESPERADO` / `EXPECTED`
- `ESCENARIO` / `SCENARIO`

Para probar una conversación completa, se recomienda `FULL-CERT`. Si `ESCENARIO` queda vacío, todas las filas del Excel pertenecen al mismo escenario y comparten el mismo `conversationId` del ledger.

La semilla/código de una batería Excel se deriva de su contenido. Volver a cargar el mismo contenido permite repetir la misma serie literal. Las preguntas importadas pasan por `/event-ai/analyze`, exactamente igual que una pregunta normal de Zuzu.

## Persistencia

Se incluye `sql/ce_zuzu_conversation_ledger.sql` para crear las tablas dedicadas. Mientras no se aplique, el backend dispone de fallback en `ce_meta`; las tablas dedicadas son la opción recomendada para DATASET grandes y continuidad a largo plazo.


## Contrato del ledger

- Cada turno es inmutable: conserva el JSON bruto emitido por Gemini, el PLAN normalizado y la ejecución realizada por CE.
- Los PLAN son dispersos: no se rellenan persona, tienda, evento, producto u otros campos que no participen en la pregunta.
- `QUERY` obtiene un DATASET nuevo y puede aplicar después operaciones locales (`operations`) sin segunda consulta.
- `LOCAL` reutiliza un DATASET persistido y admite varias operaciones en el mismo turno.
- `REFERENCE` distingue `restore_snapshot` (ver exactamente el resultado antiguo) de `reexecute_plan` (repetir el plan contra los datos actuales).
- `INSPECT` describe un turno existente y `CONVERSATION` no consulta datos.
- Las referencias históricas se buscan en el ledger del usuario; si hay ambigüedad se presentan candidatos y no se elige uno arbitrariamente.
- Al recuperar una conversación pasada, la respuesta recuerda al usuario la fecha y el asunto antes de reutilizar el resultado.

## Multievento

`comparison` acepta `named_events` explícitos o `event_series`. SCC certifica primero el conjunto real de eventos y después CE ejecuta el mismo extractor comparativo para todos ellos. El mecanismo no exige que los eventos pertenezcan a la misma serie ni que sean del mismo tipo.
