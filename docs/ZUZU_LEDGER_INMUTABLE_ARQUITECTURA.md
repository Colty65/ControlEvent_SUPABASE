# ControlEvent v4_1_exp · Zuzu Ledger Inmutable

## Objetivo

La conversación deja de depender de un frame semántico mutable. Cada turno crea un registro inmutable con tres capas separadas:

1. `gemini_plan`: JSON bruto emitido por Gemini.
2. `normalized_plan`: pseudocódigo disperso que CE puede ejecutar.
3. `execution`: lo que CE ejecutó realmente, con referencias a DATASET y VIEW.

Los turnos anteriores no se reescriben.

## Acciones del pseudocódigo

- `query`: obtiene datos nuevos. Debe indicar `domain` y `scope`; solo contiene entidades/campos que intervienen en esa consulta.
- `local`: opera sobre un DATASET ya persistido. Admite varias operaciones en el mismo turno y nunca consulta BBDD.
- `reference`: `restore_snapshot` recupera exactamente un resultado anterior; `reexecute_plan` vuelve a ejecutar el QUERY de origen contra los datos actuales y permite cambios explícitos.
- `inspect`: describe un turno existente.
- `conversation`: conversación sin consulta de datos.
- `clarify`: presenta candidatos cuando una referencia histórica es ambigua.
- `reset`: empieza un foco nuevo sin borrar el ledger histórico.

## Persistencia server-side

SQL: `sql/ce_zuzu_conversation_ledger.sql`.

Tablas dedicadas:

- `ce_zuzu_conversations`
- `ce_zuzu_turns`
- `ce_zuzu_datasets`
- `ce_zuzu_views`

El navegador conserva el `conversation_id`, el `turn_id` actual y extractos ligeros para la interfaz. DATASET, VIEW, trazas y planes completos se recuperan del servidor cuando hacen falta. Si las tablas aún no existen, el backend usa temporalmente `ce_meta`; las tablas dedicadas son la configuración recomendada.

## Memoria histórica humana

Frases de recuerdo o vuelta a asuntos anteriores activan una búsqueda en el ledger del usuario. Gemini recibe candidatos con referencias (`Hn`/`Pn`) y no las filas completas.

- Referencia inequívoca: se recupera/reutiliza directamente.
- Referencia ambigua: Zuzu presenta las conversaciones candidatas y pide elegir.
- Al recuperar un asunto pasado, Zuzu antepone un recordatorio humano con usuario, fecha y asunto.

## DATASET / VIEW

Un QUERY crea un DATASET persistido. Las transformaciones posteriores crean VIEW nuevas sin duplicar el DATASET. Operaciones disponibles:

- `set_fields`
- `add_field` / `add_fields`
- `remove_field` / `remove_fields`
- `show_all_fields`
- `sort`
- `filter` (incluye comparadores numéricos)
- `group`
- `limit`
- `chart`

Un QUERY puede incluir `operations` post-DATASET para resolver en una sola extracción rankings, agrupaciones, ordenaciones o presentaciones.

## Multievento

`comparison` trabaja con el mismo mecanismo tanto para series como para listas heterogéneas:

1. Gemini expresa intención y scope (`event_series` o `named_events`).
2. SCC certifica los eventos reales.
3. El PLAN ejecutable congela el conjunto canónico como `named_events`.
4. CE aplica el mismo extractor comparativo a todos ellos.
5. Se materializa un único DATASET comparativo reutilizable localmente.

La lógica no depende de nombres concretos de evento.

## ITV Excel

La ITV acepta `.xlsx`/`.xlsm` mediante `CARGAR EXCEL`. La hoja `PREGUNTAS` usa `PREGUNTA` como columna obligatoria. Las preguntas pasan por el mismo `/api/event-ai/analyze` y, en `FULL-CERT`, comparten el mismo `conversationId` dentro del escenario.

La semilla/código de batería se deriva del contenido, de modo que el mismo Excel puede repetirse literalmente.

Ficheros de ejemplo incluidos:

- `tests/ITV_Zuzu_Bateria_Tecnica_21.xlsx`
- `tests/ITV_Zuzu_Bateria_Humana_33.xlsx`

Los informes ITV conservan `conversationId`, `turnId`, acción del ledger, JSON Gemini y PLAN normalizado para comparar ejecuciones.

## Auditoría local incluida

`npm run test:zuzu-ledger`

Comprueba entre otros:

- pseudocódigo disperso;
- producto siempre operativo si existe;
- persona tipada según la fuente;
- LOCAL multioperación;
- QUERY con operaciones post-DATASET;
- filtros numéricos;
- conservación de 923 filas (regresión del antiguo límite 220);
- SCC para serie multievento;
- comparación de eventos heterogéneos;
- memoria histórica y preámbulo humano;
- contrato de la tool única `zuzu_turn_record`.

## ANSWER_BLUEPRINT + ANSWER_PAYLOAD (23/08/2026)

La misma llamada Gemini que compila el turno puede incluir un `answer_blueprint` breve. Ese molde no contiene hechos: solo texto y placeholders. Después de ejecutar, CE genera un `ANSWER_PAYLOAD` con los hechos reales y rellena el molde. Si el molde no es seguro o le falta un dato, se ignora y se usa la redacción determinista.

Invariante: **Gemini redacta el molde; ControlEvent posee los hechos.** No existe una segunda llamada Gemini para redactar.
