# ControlEvent v4_0_exp · RAW14Q · Memoria episódica Zuzu

## Objetivo

RAW14Q convierte el ledger histórico de Zuzu en una memoria recuperable por usuario sin confundir recuerdo histórico con dato actual. El turno que coincide con una referencia humana es solo un puntero: al localizarlo, Zuzu recupera la conversación completa a la que pertenece y reconstruye sus turnos sustanciales de más antiguo a más reciente.

## Qué se almacena como recuerdo

El ledger técnico continúa guardando todos los turnos para auditoría. La memoria recordable solo incluye turnos con sustancia. Se excluyen fallos de compilación/ejecución, respuestas finales fallidas, ruido o entrada incoherente, aclaraciones técnicas y cambios puramente visuales de tabla. Cada recuerdo conserva usuario, conversation_id, turn_id, timestamp, pregunta literal, respuesta real, un resumen compacto de hasta cinco líneas, entidades y una firma operativa del PLAN original.

La calidad se clasifica internamente. `memory_quality >= 2` significa recuerdo recuperable. Los turnos de consulta con datos, entidades o una respuesta suficientemente rica reciben prioridad superior.

## Recuerdo por referencia humana

La búsqueda admite referencias temáticas y temporales, incluyendo expresiones como `ayer`, `anteayer`, `por la mañana`, `por la tarde`, `por la noche`, `hace N días/semanas/meses`, `la semana pasada`, `el mes pasado`, meses del año y `el año pasado por estas fechas`.

Una coincidencia Hn identifica un turno, pero el sistema asciende inmediatamente a su `conversation_id`. La respuesta de recuerdo presenta el episodio completo (solo los turnos sustanciales), cronológicamente de más antiguo a más reciente. Si hay varias conversaciones plausibles, el compilador puede pedir al usuario que elija.

`recall_episode` recuerda el episodio sin modificar ni reejecutar los datos antiguos. `resume_episode` retoma ese contexto histórico desde el principio. `reexecute_plan` sigue siendo la vía para volver a ejecutar hoy la consulta original y obtener datos actuales.

## Memoria proactiva

Cuando el usuario hace una consulta nueva muy similar a una conversación sustancial de los últimos cuatro días, Zuzu puede sugerir espontáneamente el recuerdo. La conversación histórica se presenta primero como memoria y después la consulta actual se responde exclusivamente con los datos CE actuales. Hay un cooldown por conversación para no repetir la misma alusión en cada turno.

## Memoria social

Si no hay una coincidencia proactiva fuerte, CE puede aportar a la fase final como máximo dos pistas históricas pertinentes. Zuzu tiene permiso para usar como máximo una alusión breve si encaja naturalmente. Nunca puede convertir una cifra antigua en dato actual ni recitar un inventario de recuerdos.

## Persistencia

La migración `sql/ce_zuzu_memory_raw14q.sql` añade a las tablas del ledger columnas específicas de memoria. Es idempotente. El código conserva compatibilidad si la migración todavía no se ha ejecutado: el índice recordable y los episodios se mantienen también en `ce_meta`, y los turnos históricos pueden reproyectarse dinámicamente para construir la memoria limpia.

No se duplican los DATASET históricos dentro de la memoria. La firma del PLAN permite recuperar el significado operativo sin inflar el almacenamiento.

## Micrófonos

RAW14Q no modifica el motor de micrófonos. Se mantiene exactamente la base RAW14P/RAW14O y el trabajo de voz queda aparcado hasta nueva orden.

## Pruebas

- `scripts/zuzu-raw14q-memory-episodic-regression.cjs`: 32 comprobaciones.
- `scripts/zuzu-history-ranking-regression.js`: OK.
- `scripts/zuzu-raw14p-entertainment-copy-regression.cjs`: 14/14.
- `scripts/zuzu-raw14p-voice-lifecycle-regression.cjs`: 20/20.
- `scripts/zuzu-raw14k-pdf-coherence-regression.cjs`: 21/21.

El antiguo test RAW14L mantiene una comprobación de una versión previa del cierre de Voz CE que ya no coincide con el motor RAW14P; por ello no se usa como criterio de regresión de RAW14Q.
