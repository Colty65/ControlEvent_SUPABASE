# CE_v21_PROD_BASE_FIX9

Base: CE_v21_PROD_BASE_FIX8.

Cambio centrado en Zuzu/ControlEvent:

- Zuzu vuelve a ser el primer planificador de módulos/filtros.
- ControlEvent deja de imponer `todos=true` cuando el prompt contiene eventos concretos.
- Si el usuario nombra eventos explícitos o restringe el alcance con SOLO/EXACTOS/no consulta global/no otro evento:
  - `todosLosEventos=false` queda forzado.
  - `strictEventScope=true` queda marcado.
  - ControlEvent extrae solo esos eventos.
- El plan local de ControlEvent queda como respaldo, no como dueño del alcance.
- Si Zuzu devuelve `todosLosEventos=true` junto con una lista cerrada de eventos, ControlEvent lo bloquea y añade traza `Paso 1b · Control de alcance CE`.
- La extracción de módulos usa los módulos del planificador Zuzu cuando existe, sin unionar obligatoriamente módulos locales.

No tocado:
- logon
- selector/desplegable
- rendimiento
- Vista aérea
- Resumen/ASISTENCIA
- ingresos/descuentos
