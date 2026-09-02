# ITV · INTÉRPRETE GEMINI V2

Objetivo: medir si Gemini entiende la intención de ControlEvent antes de que CE ejecute nada.

Pipeline aislado:
1. Enriquecimiento determinista de nombres/datasets conocidos.
2. Gemini devuelve un lenguaje conceptual pequeño: DATA, TABLE, CALCULATE, MEMORY, PERSON, CHAT, CLARIFY o UNSUPPORTED.
3. Un traductor determinista convierte el concepto a contratos CE.
4. El registro CE audita si esos contratos serían ejecutables.
5. No se consulta Supabase ni se ejecutan módulos de datos.

Métricas separadas:
- INTENCIÓN GEMINI: comprende qué hacer, sobre qué objetos y con qué restricciones.
- ESTABILIDAD 3/3: las tres repeticiones del escenario son conceptualmente correctas.
- TRADUCCIÓN A CE: el compilador conceptual produce contratos válidos.
- JSON LIMPIO: transporte sin caracteres extra o JSON roto. Un primer objeto recuperable puede seguir evaluándose semánticamente.
- POLÍTICA ANÁLISIS: si hace falta una segunda IA para interpretar resultados. No forma parte de la nota de intención.

Cambios respecto a V1:
- Gemini no escribe view_filters, view_sort, visible_columns, derive_field ni action=search/read de los contratos internos.
- Los nombres conocidos se enriquecen antes de Gemini como PERSON/EVENT.
- Los datasets visibles se entregan con id/título y pistas deterministas por título.
- El traductor conceptual -> CE es 100% determinista y no interpreta castellano.
- Los errores de transporte ya no destruyen automáticamente la medición de intención si se puede recuperar el primer objeto JSON completo.
- Comparar datos no obliga por sí solo a analysis=true; solo se exige cuando el usuario pide interpretar, explicar, resumir analíticamente o buscar hallazgos.
