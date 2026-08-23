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

## Corrección carga Excel ITV · 22/08/2026

Incidencia reproducida exactamente con las dos baterías entregadas:

`Cannot read properties of undefined (reading 'sheets')`

Causa: el importador ITV ejecutaba `ExcelJS.Workbook().xlsx.load()` en el navegador. Los XLSX de las baterías son OOXML válidos pero usan prefijos de namespace (`x:workbook`, `x:worksheet`, etc.). ExcelJS 4.4.0 en navegador no materializa `workbook.xml` en ese caso y falla antes de llegar a leer las preguntas.

Corrección aplicada:
- La ITV ya no interpreta el XLSX con ExcelJS en el navegador.
- El navegador solo lee el fichero seleccionado y lo envía al endpoint GD `/api/zuzu-tests/import-excel`.
- El servidor extrae únicamente las piezas OOXML necesarias mediante un lector ZIP/XLSX propio basado en `node:zlib`, sin cargar la librería Excel en el dispositivo.
- El parser acepta tags OOXML con o sin prefijo de namespace, celdas `str`, `inlineStr`, `sharedStrings`, números y booleanos.
- Límite de seguridad: 8 MB por batería ITV.
- La lógica posterior de semilla estable, código XLS, escenario y FULL-CERT no cambia.

Regresión añadida: `npm run test:zuzu-itv-excel`.

Resultado de auditoría con los mismos archivos que daban el error:
- `ITV_Zuzu_Bateria_Tecnica_21.xlsx`: 21/21 preguntas leídas correctamente.
- `ITV_Zuzu_Bateria_Humana_33.xlsx`: 33/33 preguntas leídas correctamente.
- Sintaxis JS global: 234 archivos OK.

## Auditoría posterior a las baterías reales · 23/08/2026

Se analizaron las cuatro ejecuciones ITV entregadas (AI-SMOKE/FULL-CERT, técnica/humana). Se confirmó que el semáforo anterior podía marcar OK aunque la respuesta fuese una aclaración, una referencia perdida o un fallo de ejecución. Esta versión cambia el criterio de certificación.

### ITV: OK / WARN / KO reales

- Las baterías Excel admiten un `ORACULO_JSON` por fila o columnas `EXPECTED_*`.
- El oráculo de ledger comprueba, cuando se declara: acción, dominio, ámbito, evento, referencia, entidad, entidades prohibidas, filas, campos, operaciones, tipo de respuesta y gráfica.
- Un resultado de ejecución fallida (`ControlEvent no pudo ejecutar`, scope incompleto, evento no certificable, etc.) es KO aunque la llamada HTTP haya terminado correctamente.
- Una aclaración o una referencia no resuelta es WARN, no OK.
- Una respuesta canónica con total vacío (`por .`, `total de .`) es WARN.
- Las dos baterías Excel incluidas llevan ahora oráculos estructurales por turno; ya no dependen del texto genérico «respuesta coherente».
- El informe muestra en `ORÁCULO:` la razón concreta del WARN/KO.

Regresiones nuevas:
- `npm run test:zuzu-itv-excel`: 21/21 + 33/33 preguntas, todas con oráculo estructural leído.
- `npm run test:zuzu-itv-oracle`: verifica que un caso correcto da OK, una respuesta semánticamente equivocada da KO, una aclaración da WARN, un fallo CE da KO y un total vacío da WARN.

### Memoria histórica

El índice histórico almacena ahora etiquetas semánticas del PLAN inmutable (acción, dominio, entidades, ámbito y operaciones), además del título/foco derivado. El ranking pondera:

1. entidad/tema citado literalmente en la pregunta original del turno;
2. entidades explícitas del PLAN;
3. foco derivado;
4. título/resumen.

Los turnos QUERY/REFERENCE reciben prioridad sobre aclaraciones/inspecciones, y expresiones genéricas como «al principio» favorecen los primeros turnos sin codificar nombres concretos. La tokenización incorpora normalización plural genérica para que «donación/donaciones» o «compra/compras» compitan como el mismo concepto.

Regresión nueva: `npm run test:zuzu-history-ranking` comprueba que:
- «vuelve a Vicente» prefiere el turno que nombra a Vicente frente a un foco derivado posterior;
- «lo del principio de Pocholo» favorece el turno inicial;
- «la donación de Pocholo» favorece el recuerdo de donaciones frente al de compras.

### Conversación y análisis

- El contrato de turno incorpora `response_kind`: amount, who, what, whether, which_event, compare, summary, table, context y conversation_summary.
- CE puede responder determinísticamente según el tipo de pregunta en vez de usar siempre «He preparado N registros».
- `INSPECT conversation_summary` resume el ledger de la conversación completa, no solo el último DATASET.
- Se incorpora la operación `rank`, ejecutada localmente sobre el DATASET, con dimensión, métrica, referencia, operador y límite. Permite expresar preguntas del tipo «quién ha comprado más que X» sin hard-code de personas.
- `RECENT_TURNS` incluye un resumen semántico del PLAN para que pronombres y referencias cortas apunten a la cápsula correcta sin reconstruir un estado global.

### Totales

Se corrige la plantilla canónica para que `null` no se trate como un total numérico válido. Si no hay total materializado, CE omite la cláusula económica en vez de producir `por .` o `con un total de .`. El ITV detecta además cualquier reaparición de esa salida como WARN.

### Limitación de esta auditoría

La construcción local no dispone de las dependencias/credenciales necesarias para ejecutar una nueva batería E2E pagada contra Gemini. Por eso la certificación final de interpretación se hace en la ITV desplegada. Sí se han ejecutado localmente la sintaxis global y las regresiones autocontenidas de Excel, oráculo y ranking histórico antes de empaquetar.

### Comparación explícita de entidades

Se añade `compare` como operación analítica genérica junto a `rank`. Recibe `group_field`, `metric` y una lista `values`, agrupa una sola vez sobre el DATASET y filtra localmente los valores solicitados con operador interno `one_of`. Esto permite expresar comparaciones como dos personas, tiendas, productos o eventos sin codificar nombres concretos y sin duplicar consultas.
