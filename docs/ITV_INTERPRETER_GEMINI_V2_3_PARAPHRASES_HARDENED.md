# ITV · Intérprete Gemini V2.3 · Paráfrasis Hardened

Objetivo: comprobar generalización lingüística del planificador conceptual sin ejecutar CE ni sustituir Zuzu.

## Diseño

- 30 intenciones funcionales.
- 3 formulaciones humanas distintas por intención = 90 decisiones Gemini.
- La tercera formulación introduce ruido hablado/escrito cuando procede: `Sisa 2026`, `Pohcolo`, `Colti`.
- El enriquecedor resuelve candidatos de entidad de forma determinista por coincidencia literal o distancia de edición; no decide la intención.
- Gemini sigue trabajando en el lenguaje conceptual pequeño: DATA, TABLE, CALCULATE, MEMORY, PERSON, CHAT, CLARIFY, UNSUPPORTED.
- El traductor conceptual -> CE es determinista y CE no ejecuta datos en esta ITV.

## Cambios frente a V2.1

1. Ya no se repite tres veces la misma frase: cada grupo usa tres paráfrasis.
2. CHAT queda dividido en `social` y `session_summary`; un saludo no puede aprobar como resumen de sesión.
3. El modo de segunda IA se decide determinísticamente para TABLE/analyze, TABLE/summarize, MEMORY/summarize y CALCULATE. Solo queda como hint del planificador cuando compare_events incluye una petición adicional de insights.
4. Coincidencia aproximada genérica de nombres para ruido oral/escrito, sin aliases hard-code de intención.
5. Métricas principales: intención por paráfrasis 3/3 y consistencia de compilación CE 3/3.

## Criterio de avance

Si esta batería real alcanza >=95% de intención y mantiene una consistencia CE cercana al 100%, el siguiente paso es una ITV de ejecución controlada: Gemini manda -> traductor CE -> CE ejecuta, todavía sin sustituir el runtime Zuzu productivo.


## Endurecimiento V2.3

V2.3 conserva exactamente las 30 intenciones × 3 paráfrasis de V2.2 para que la comparación sea limpia. No cambia el examen para ocultar los 10 KO.

Cambios de arquitectura medidos:

- `event_summary` queda separado semánticamente de `event_documentation`: puesta al día/estado global frente a documentos/archivos.
- `MEMORY/search` queda separado de `PERSON/profile`: conversación histórica frente a ficha actual de persona.
- un `available_dataset` tiene prioridad cuando el usuario vuelve a una tabla ya materializada; no se reconsulta un módulo DATA.
- análisis sobre una comparación ya materializada usa `TABLE/analyze`; `compare_events` queda para construir una comparación nueva.
- `TABLE/reset` significa restaurar todas las filas/eliminar filtros; `TABLE/select` solo selecciona dataset.
- el traductor acepta `field` como alias inequívoco de `column` en operaciones de columna y `TABLE/MAX` como forma equivalente de `CALCULATE/MAX`. Esto es normalización de sintaxis, no reinterpretación lingüística.
- `CALCULATE` solo puede ejecutarse sobre un dataset materializado y un campo real del esquema. Ya no puede inventarse un `COUNT cubatas` sin datos.
- personas y eventos de un plan deben resolver contra entidades reconocidas; valores inventados no se ejecutan.
- el fuzzy usa Damerau-Levenshtein más estricto: conserva `Sisa→SySA`, `Pohcolo→Pocholo`, `Colti→Colty` y evita falsos positivos como `corto→Colty`.

La batería sigue siendo planner-only: no ejecuta CE ni modifica Supabase.
