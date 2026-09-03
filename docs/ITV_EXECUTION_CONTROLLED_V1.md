# ITV · EJECUCIÓN CONTROLADA V1

## Objetivo

Validar la arquitectura que se está estudiando para Zuzu sin sustituir todavía el runtime conversacional actual:

`Usuario -> enriquecimiento determinista -> Intérprete Gemini V2.3 -> traductor conceptual -> ControlEvent real`

Esta ITV sí ejecuta lecturas y cálculos contra los datos reales de ControlEvent. No genera la respuesta humana final de Zuzu y no modifica datos.

## Principio de atribución

Cada turno se clasifica en una sola capa principal:

- `INTERPRETATION`: Gemini no entendió correctamente la petición. La orden incorrecta **no se ejecuta**.
- `TRANSLATION`: el plan conceptual era correcto pero no pudo compilarse a un contrato CE válido.
- `CE`: la orden era correcta y ejecutable, pero ControlEvent falló o devolvió un resultado incompatible.
- `CAPABILITY`: la ejecución intentaría salir del conjunto de capacidades de solo lectura admitidas por esta ITV.
- `DATA_GAP`: la prueba depende de datos reales que no existen en esa BBDD (por ejemplo, ningún recuerdo histórico encontrado). Se marca `SKIP`, no KO.
- `TRANSPORT`: error técnico antes de disponer de un plan utilizable.
- `OK_NO_EXECUTION`: el turno era CHAT/UNSUPPORTED y correctamente no debía tocar CE.
- `OK`: plan, traducción y ejecución CE coherentes.

## Seguridad

Hay una allowlist explícita de capacidades de solo lectura. Esta ITV no importa ni llama a `saveState` ni a mutaciones de Supabase. Las capacidades permitidas son consultas de evento/persona/memoria, vista de datasets, resúmenes y derivaciones deterministas.

La prueba no enlaza ni modifica conciliaciones bancarias, compras, liquidaciones, eventos, personas ni ningún mantenimiento.

## Batería V1 · 25 turnos

La batería elige entidades reales de la BBDD al abrirse. Prioriza un evento con compras realizadas cuyo dataset pueda materializarse completo para probar vista/ordenación; selecciona un segundo evento distinto y dos personas reales con actividad de compras cuando existen.

Se prueban, en una sola sesión encadenada:

1. resumen de evento;
2. compras realizadas;
3. ordenar el dataset materializado;
4. ocultar una columna;
5. quitar filtros / recuperar todas las filas;
6. MAX sobre el dataset sin reconsultar la fuente;
7. ingresos pendientes;
8. documentación;
9. banco;
10. comparación de dos eventos;
11. análisis de la comparación ya materializada;
12. MAX sobre la comparación;
13. perfil de persona;
14. referente pronominal de esa persona;
15. dos personas en una sola petición;
16. referente plural;
17. persona dentro de evento;
18. volver a una tabla de compras anterior sin reconsultarla;
19. resumir esa tabla materializada;
20. buscar memoria histórica;
21. abrir el primer recuerdo real;
22. resumir el recuerdo;
23. petición predictiva no soportada, que no debe ejecutar CE;
24. cambio de foco a otro evento;
25. resumen de la sesión actual, que no debe ejecutar CE.

Los turnos de memoria 21/22 se marcan `DATA_GAP/SKIP` si la búsqueda real del turno 20 no devuelve episodios. Eso no suspende al intérprete ni a CE.

## Qué se exporta

El JSON de la ITV conserva por turno:

- mensaje del usuario;
- contexto compacto entregado a Gemini;
- estado enriquecido;
- plan conceptual Gemini;
- texto JSON crudo del planner;
- acciones CE traducidas;
- resultado real CE resumido (facts + hasta 12 filas por tabla);
- validación de resultado;
- últimas trazas CE de la operación;
- diagnóstico y motivos;
- tokens/coste del planner.

Nombre de batería: `EXECUTION-CONTROLLED-V1-25`.

## Qué NO demuestra una regresión local

Los tests estáticos del ZIP verifican estructura, aislamiento, allowlist read-only y compatibilidad. No certifican el comportamiento real de Gemini ni los datos de la BBDD. Esa certificación solo existe después de ejecutar la ITV desde la aplicación y analizar el JSON exportado.
