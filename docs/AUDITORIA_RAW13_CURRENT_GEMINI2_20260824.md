# RAW13 · CURRENT semántico + Gemini 2 aislado

Cambios estructurales derivados de la conversación real de 23 turnos y del contraste externo con Gemini:

- `ce_local` opera únicamente sobre `CURRENT`; Gemini no administra `dataset_id`, `view_id` ni referencias Tn para transformaciones locales.
- `CURRENT_CONTEXT` expone `dataset_target`, `last_intent`, filtros semánticos y `view_state` sin reenviar filas masivas.
- Una entidad de negocio nueva sustituye a la anterior del mismo tipo mediante una nueva `ce_query`; `ce_local` no cambia filtros semánticos.
- Las peticiones abiertas sobre personas usan `person`; `people` queda reservado a asistencia/presencia.
- Un `scope` incompleto es rechazado antes de ejecución y se permite una única recompilación por Gemini. CE no reinterpreta el significado.
- Gemini 2 no recibe historial textual previo ni dataset anterior para `conversation`, `set_context` o `clarify`.
- `conversation`, `set_context` y `clarify` no pueden reactivar tablas/gráficas del turno anterior.
