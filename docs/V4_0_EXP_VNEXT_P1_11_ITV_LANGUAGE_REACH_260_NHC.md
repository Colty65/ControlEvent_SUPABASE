# VNext P1.11 · ITV Language Reach 260 · NHC

## Objetivo

Medir de forma reproducible el alcance real del lenguaje de Zuzu antes de seguir ampliando funcionalidades. La ITV incorpora cuatro baterías crecientes que usan los datos reales de ControlEvent y la misma tubería de conversación que un usuario normal.

- **BÁSICA · 50**: preguntas explícitas, normalmente de un dominio y un objetivo. Referencia inicial: 95–100%.
- **MEDIA · 60**: 20 conversaciones de 3 turnos con continuidad, comparaciones, cambios de foco y operaciones de tabla. Referencia inicial: alrededor del 90%.
- **DIFÍCIL · 70**: 14 conversaciones de 5 turnos con composición, tablas reversibles, varias intenciones, gráficas, elipsis y lenguaje ruidoso. Se espera inicialmente menos del 50%.
- **EXTREMA · 80**: 16 conversaciones de 5 turnos que fuerzan cruces, derivaciones, escenarios, anomalías, multientidad y peticiones abiertas. Se espera inicialmente menos del 25%.

Total: **260 preguntas**.

## Uso en ITV

En `PRUEBAS ZUZU` aparece el bloque **ALCANCE DEL LENGUAJE ZUZU** con cuatro botones. Al elegir una batería:

1. se genera con una semilla reproducible y entidades reales de la instalación;
2. se selecciona automáticamente `FULL-CERT`;
3. se fija `Máx. casos IA` al tamaño exacto (50/60/70/80);
4. se propone un presupuesto máximo proporcional, editable por el GD;
5. al pulsar `INICIAR`, ITV recorre toda la batería automáticamente;
6. el informe conserva pregunta, oráculo, respuesta, PLAN Gemini, ejecución CE, llamadas, tokens y latencia.

El cierre muestra también **COBERTURA OK %** para comparar rápidamente niveles y versiones.

## Regla NHC

Estas 260 frases son **datos de prueba exclusivamente**. No forman parte del prompt de producción, no introducen regex de interpretación y no añaden `if` lingüísticos al runtime de Zuzu.

La regla de trabajo queda así:

**Usuario → Gemini interpreta/compone → contrato estructurado → CE ejecuta/presenta.**

Cuando una pregunta de estas baterías falle:

- si la capacidad ya existe y Gemini elige mal, se corrige catálogo/contexto/prompt de Gemini;
- si la petición no puede expresarse con las capacidades existentes, se diseña una capacidad general nueva;
- nunca se corrige el fallo añadiendo una regla basada en las palabras concretas de la pregunta.

## Alcance de P1.11

P1.11 es instrumentación diagnóstica. No modifica `services/event-ai.service.js` ni añade nuevas reglas de lenguaje al runtime. Primero medimos el terreno con 260 pruebas; después usamos los resultados para limpiar/ampliar la arquitectura con evidencia, no por tanteo.
