# VNext P1.22.2 · Current Dataset State + Summary + Leak Guard · NHC

## Motivo
La prueba manual de P1.22.1 confirmó que la obtención factual ya era sólida, pero el dataset de trabajo se desmontaba al operar varios turnos sobre una tabla: las columnas ocultas no se acumulaban, reabrir/leer podía reconstruir la tabla original, una respuesta conversacional hacía desaparecer el artefacto y llegó a filtrarse `Contexto VNext` al usuario.

## Cambios
- `working_set` persistente en `resultContext.current_dataset` con filas/columnas base separadas de `view_state`.
- `view_state` acumulativo: filtros, orden, columnas visibles y columnas ocultas sobreviven a turnos sucesivos; `reset_table` es el único reset explícito.
- `view_current` siempre reconstruye la vista desde el dataset base; ocultar una columna no destruye el dato de origen.
- El dataset/tablas actuales se conservan también en turnos conversacionales sin tools, hasta que otro resultado tabular los sustituya.
- Nueva operación `summarize_current`: resume únicamente el contenido visible del dataset actual y respeta columnas ocultas.
- `recall_memory/current` detecta también `facts.action=current`, de modo que el cierre de resumen no se queda en «he reunido N turnos».
- Un fallo transitorio de `recall_memory/read` recibe un único retry del mismo identificador estructurado.
- Cortafuegos de salida para `Contexto VNext`, `resultContext`, `capabilityAudit`, `normalizedArgs` y `source_args`.
- El contexto interno enviado al modelo se etiqueta como `ESTADO_INTERNO_NO_REPETIR`.

## NHC
No se incorporan frases concretas de prueba, nombres propios ni regex nuevos para interpretar lenguaje del usuario. El estado trabaja con dataset, columnas, filtros, orden, operación y metadatos estructurados.

## Prueba objetivo
1. Abrir conversación recordada.
2. Ocultar Fecha → Coincidencia → Pregunta → Resumen de forma acumulativa.
3. Intercalar conversación y comprobar que la tabla permanece.
4. Resumir la columna Respuesta visible mediante `summarize_current`.
5. Volver a mostrar la misma tabla sin reabrir el origen.
6. Verificar que nunca aparece JSON/contexto interno.
