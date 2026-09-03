# ControlEvent v4_1_exp · Zuzu VNext P1.1

P1.1 corrige el fallo observado en P1.0 donde la decisión JSON podía devolver `mode=conversation` sin `answer` y la UI terminaba mostrando `Vale, seguimos.`.

## Cambio estructural

- Gemini vuelve a decidir mediante `function_call` nativo.
- Las operaciones de datos siguen siendo los contratos empresariales estrechos de P1.
- Tras una función de datos, ControlEvent ejecuta y presenta localmente sin segunda llamada IA.
- Una consulta factual normal consume una Interaction IA.
- Los turnos puramente conversacionales mantienen `previous_interaction_id`.
- Los turnos con función se cierran localmente y el siguiente turno usa un puente compacto de los últimos turnos visibles, evitando encadenar una Interaction pendiente de `function_result`.
- Se elimina `Vale, seguimos.` como fallback válido.
