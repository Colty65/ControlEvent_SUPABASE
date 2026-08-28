# ControlEvent v4_0_exp · BANK4_9 · Zuzu Z1 cierre quirúrgico

BANK4_9 parte de BANK4_8 y ataca los fallos detectados por la ITV ORACLE_ACTIVE del 28/08/2026 (50 OK / 12 WARN / 16 KO).

## Cambios principales

- Los IDs internos devueltos por Gemini dejan de ser autoridad. CE recupera únicamente IDs canónicos exactos o una relación de prefijo literal unívoca; nunca hace fuzzy con IDs ni persiste un ID inventado.
- Los scope contradictorios `all_events + event/events explícitos` conservan las entidades explícitas.
- Una continuación elíptica sin EVENT nueva conserva el `named_event/named_events` vivo, salvo petición global explícita.
- Las referencias temporales de año anterior/siguiente se resuelven contra el catálogo canónico y la familia del evento activo.
- Las comparaciones multi-evento conservan la métrica (ingresos, compras, donaciones, saldo, valoración, asistencia) y rankean por Evento; no suman los eventos entre sí.
- `people_mode` redundante en `person` se elimina como ruido de contrato y no bloquea la consulta.
- La asistencia usa `attendees_canonical/total_attendees_people`, no el número de filas administrativas.
- Banco y documentación tienen respuestas canónicas locales con sus magnitudes reales; el aviso de evento En curso no puede sustituir el resultado.
- FAST-LOCAL se amplía a asistencia, banco y documentación incluso cuando Gemini omite `response_kind` pero el dataset es canónico.
- MEMORY GATE 2 considera también `all_events` un ancla operativa explícita, evitando búsquedas históricas innecesarias.
- La ITV corrige el oráculo de “compras pendientes”: ahora selecciona eventos con Pte.Compra real y calcula el conjunto pendiente, en vez de validar contra compras realizadas.
- Build ITV: `20260828-BANK49-CANONICAL-ID-MULTIENTITY-FASTLOCAL-MEMORY2`.

## Base de comparación

BANK4_8: FAST 620/620 (619 OK / 1 KO por 9 DOC huérfanos); FULL-CERT 50 OK / 12 WARN / 16 KO; mediana 5,744 s; P90 9,105 s; coste medio 0,000789 €/turno.

BANK4_9 mantiene deliberadamente los 9 DOC huérfanos sin modificarlos: son una incidencia de datos histórica y no deben ocultarse desde código.

## SQL

No requiere SQL.
