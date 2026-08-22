# Auditoría previa a ZIP · Zuzu Ledger Inmutable

Fecha: 22/08/2026

## Implementación comprobada

- Ruta activa `/event-ai/analyze` entra en `runZuzuV73Ledger`.
- Ledger server-side e inmutable: conversación, turno, DATASET y VIEW.
- JSON bruto Gemini y PLAN normalizado quedan persistidos por turno y visibles en traza de laboratorio.
- Pseudocódigo disperso: no rellena entidades ajenas a la pregunta.
- `QUERY`, `LOCAL`, `REFERENCE`, `INSPECT`, `CONVERSATION`, `CLARIFY`, `RESET`.
- `LOCAL` multioperación y sin reconsulta de BBDD.
- `QUERY.operations` permite transformar el DATASET recién obtenido sin una segunda extracción.
- Referencias históricas con candidatos y desambiguación.
- Preámbulo humano con usuario, fecha escrita y asunto al recuperar una conversación pasada.
- SCC certifica `event_series` y congela el conjunto real de eventos.
- Comparación multievento admite conjuntos de eventos heterogéneos.
- ITV admite Excel y conserva la misma `conversationId` en FULL-CERT.
- Informes ITV guardan `conversationId`, `turnId`, acción, JSON Gemini y PLAN normalizado.
- El navegador archiva solo extractos ligeros; presentación completa se recupera server-side bajo demanda.
- Regresión del antiguo corte de 220 filas: probadas 923 filas conservadas.

## Pruebas ejecutadas antes de empaquetar

### Sintaxis

232 ficheros JavaScript: OK.

### `npm run test:zuzu-ledger`

OK. Controles: pseudocódigo disperso, producto operativo, capacidades tipadas, VIEW multioperación, QUERY post-DATASET, filtros numéricos, 923 filas, SCC multievento, comparación, memoria histórica y contrato tool.

### `npm run test:zuzu-invariants`

158 OK / 0 KO.

### `npm run test:zuzu-router:observed`

Casos observados: OK.

### `npm run test:zuzu-router:dry`

Banco de 100 mensajes: OK. Sin llamada a Gemini.

## Lo que NO se afirma en esta auditoría

En el entorno de construcción no hay una clave Gemini configurada. Por tanto no se ha ejecutado aquí una batería E2E pagada contra Gemini. Esa parte queda deliberadamente para ITV en el despliegue real. Las dos baterías Excel incluidas permiten hacerlo por el mismo circuito de Zuzu.

## SQL

Para usar las tablas dedicadas de largo plazo ejecutar una vez:

`sql/ce_zuzu_conversation_ledger.sql`

Sin ese SQL existe fallback server-side a `ce_meta`, pero para continuidad larga y DATASET grandes se recomiendan las tablas dedicadas.
