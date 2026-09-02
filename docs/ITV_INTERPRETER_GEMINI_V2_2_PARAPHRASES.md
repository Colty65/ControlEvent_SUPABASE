# ITV · Intérprete Gemini V2.2 · Paráfrasis

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
