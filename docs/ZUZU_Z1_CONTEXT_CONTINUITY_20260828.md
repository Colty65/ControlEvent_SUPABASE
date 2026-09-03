# ControlEvent v4_1_exp · ZUZU Z1 · Contexto y continuidad

Fecha: 28/08/2026

## Objetivo

Z1 refuerza la conversación actual sin tocar todavía la memoria histórica ni la voz como bloques funcionales. Gemini continúa siendo la autoridad semántica; ControlEvent solo conserva y ejecuta hechos tipados.

## Cambio de arquitectura

Se añade a `CURRENT_CONTEXT` un `thread_navigation` compacto y factual:

- `topics_recent_first`: asuntos operativos recientes con referencia `Tn`, dominio, scope y entidades ya resueltas.
- `events_recent_first`: eventos visitados recientemente, sin depender del evento que esté seleccionado en pantalla.
- `ordinal_sets`: conserva el orden original de eventos, personas, responsables, donantes, productos, tiendas y tickets cuando la consulta los contenía como conjunto.
- `current_result_referents`: extrae del resultado materializado actual los valores ordenados por rol (Persona, Responsable, Donante, Evento, Producto, Tienda y Ticket).

Este índice **no interpreta lenguaje**. No existe una regla CE que convierta por sí misma «el anterior», «el primero», «esa persona» o «el siguiente» en un evento/persona. Gemini recibe el índice y decide a qué se refiere el usuario.

## Navegación humana

El compilador tiene instrucciones explícitas para:

- usar `ce_set_context` cuando el usuario solo cambia el foco a una entidad previa;
- usar `ce_reference/restore_snapshot` cuando quiere volver a ver un resultado previo;
- emitir `ce_query` cuando la referencia ya está resuelta y el usuario pide datos nuevos;
- mantener el orden de conjuntos y del resultado físico para resolver ordinales sin reordenarlos;
- no pedir otra vez evento/persona si existe un referente único y claro en el hilo.

## Trazas

Cada turno incorpora `v4_1_exp · Z1 · CONTEXTO DE ENTRADA`, que muestra de forma compacta:

- scope conversacional;
- últimos temas operativos;
- secuencia de eventos visitados;
- referentes ordenados del resultado actual.

La traza observa; no modifica la decisión de Gemini.

## NHC

Z1 no añade nombres, eventos, personas ni expresiones concretas de negocio al código. El índice se deriva de PLAN/DATASET/VIEW ya resueltos y sirve para cualquier entidad futura.

## SQL

No requiere cambios de esquema ni SQL adicional.
