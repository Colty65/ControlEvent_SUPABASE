# ControlEvent v6_1-exp — Corrección presentación y cierre textual (14/11/2026)

## Hallazgos
1. La ruta `EXECUTE_DATA` devolvía `tables:[table]` al navegador de forma incondicional, incluso cuando Gemini usaba esos datos solo para contestar en texto. Esto exponía tablas de trabajo no solicitadas.
2. El filtro implícito de evento solo funcionaba con entidades que declaran `event_id`; la entidad `events` usa `id` y por ello podía consultar todos los eventos.
3. El validador aceptaba `NO_ACTION_REQUIRED` con una cadena `reply` vacía, de modo que la síntesis podía terminar con un mensaje genérico en lugar de una respuesta.

## Correcciones
- La tabla y gráfica generadas en `EXECUTE_DATA` solo se entregan al navegador cuando el pipeline contiene explícitamente `VISUALIZE`. Los datos certificados se conservan para la respuesta y el contexto del hilo aunque no se rendericen.
- En consultas `events`, si no se especifica una condición explícita `id` o `name`, se aplica por defecto el identificador del evento activo antes de materializar las filas. Los filtros explícitos siguen permitiendo otras consultas de eventos.
- Se rechaza una síntesis `NO_ACTION_REQUIRED` con respuesta textual vacía y se aprovecha la vía de reparación del contrato existente.
- Se mantiene el idioma es-ES configurado y todas las correcciones de conciliación de la versión anterior.

## Verificaciones
- `node --check services/event-ai.service.js`: OK.
- 6 comprobaciones de implementación sobre visibilidad, ámbito de evento y cierre textual: OK.
- `scripts/cuadre-banco-multievento-raw14w-regression.cjs`: 31/31 OK.
- No se ha realizado prueba real con las credenciales privadas de Gemini y Supabase.

## Pruebas de aceptación en la aplicación
1. V Jornada, «Explícame la situación económica actual de este evento» → respuesta en castellano, sin tabla global de eventos.
2. V Jornada, «Muéstrame una tabla con los datos de este evento» → permite materializar una tabla expresa del evento.
3. V Jornada, «Quiero conocer las compras previstas de este evento» → responde sobre el conjunto del evento, incluyendo ausencia de registros, sin mensaje de síntesis vacía.
4. Consulta explícita de otro evento → no se bloquea si el contrato incluye un filtro de `id` o `name`.

**No se modifican datos de Supabase.**
