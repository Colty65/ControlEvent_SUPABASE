# ControlEvent v4_0_exp · VNext P1.22

Objetivo: cerrar tres fallos reproducibles observados manualmente sin hard-code lingüístico y rehabilitar la repetición de incidencias de ITV.

## Cambios
1. `events_catalog + person` se canoniza a `person_events`; CE no descarta silenciosamente un sujeto estructurado.
2. Los resultados de `recall_memory(search/list)` quedan en `resultContext.memory_candidates`. `recall_memory(read)` puede usar `result_index`, y si el resultado previo contiene un único episodio CE completa `conversation_id` sin pedir IDs al usuario.
3. `recall_memory(current)` termina con un resumen real de la conversación mediante una única narración excepcional, en vez de quedarse en “he reunido N turnos”.
4. ITV vuelve a habilitar **REPETIR INCIDENCIAS**; en FULL-CERT reutiliza el mecanismo ya existente de reconstrucción silenciosa del escenario.

NHC: ninguna reparación inspecciona palabras concretas, nombres propios ni preguntas GOLDEN. Las decisiones se basan en `operation`, sujeto JSON, candidatos de memoria estructurados y estado de ITV.
