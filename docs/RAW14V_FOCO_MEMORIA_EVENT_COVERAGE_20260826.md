# RAW14V · Foco humano + memoria + cobertura de evento

Base: RAW14U. No se modifica el motor de voz.

## Motivo
La conversación de prueba del 26/08/2026 mostró cuatro problemas de nivel conversacional: CURRENT podía sustituir el referente humano o el recuerdo histórico; una recuperación de memoria no mantenía un puntero estable para preguntas posteriores; el catálogo maestro de tiendas podía confundirse con las tiendas realmente utilizadas en compras; y las preguntas generales sobre un evento no explotaban de forma suficientemente contextual la Descripción y los DOCxx.

## Cambios
- `DISCOURSE_FOCUS` persistente e independiente de CURRENT: conserva PERSON/PRODUCT/STORE/EVENT para pronombres y elipsis.
- `MEMORY_FOCUS` persistente e independiente de CURRENT: conserva conversation_id, matched_turn_id y un esquema cronológico compacto del episodio.
- Nueva referencia `recall_turn` para devolver pregunta/respuesta literal sin paráfrasis y sin llamada final de IA.
- Nueva referencia `reexecute_episode` para volver a ejecutar los PLAN sustanciales y distintos del episodio con datos actuales, sin reutilizar cifras históricas.
- Los recuerdos conservan el dataset activo anterior; recordar no cambia CURRENT de negocio.
- Nuevo dominio `stores_used`: se obtiene desde compras realizadas y se agrupa por Tienda/Importe. `stores`/`catalog_stores` quedan reservados al catálogo maestro.
- Regla de seguridad: una corrección conversacional no puede afirmar que ha modificado/eliminado datos si CE no ejecutó una mutación certificada.
- `EVENT COVERAGE ENGINE` con perfiles `contextual`, `broad` y `full`. CORE + NARRATIVE + DOCUMENTS son la base de las preguntas generales; el dominio conversacional anterior prioriza compras, personas, donaciones, gestión, etc.
- En modo contextual se podan arrays y KPI de facetas no seleccionadas antes de la presentación para reducir ruido y tokens.
- Descripción y comentarios/textos de DOCxx son contexto narrativo de primer nivel; no se obliga a recitarlos todos.
- Las preguntas genéricas sobre la conversación siguen resolviéndose localmente para ahorrar tokens, pero si incluyen una entidad explícita ya no pasan por el resumen local genérico.

## SQL
No requiere migración SQL. Los nuevos focos se persisten dentro del JSON `execution` ya existente.

## Regresiones
- RAW14V FOCO/MEMORIA/COVERAGE: 33/33
- RAW14U: 34/34
- RAW14T Memory Core/Experiencia: 21/21
- RAW14S Memoria fiable/proactiva: 33/33
- RAW14R Proactiva humana: 15/15
- RAW14R Memoria proactiva: 33/33
- RAW14K coherencia temporal: 21/21
- `node --check` OK en `event-ai.service.js` y `zuzu-conversation-ledger.service.js`.
