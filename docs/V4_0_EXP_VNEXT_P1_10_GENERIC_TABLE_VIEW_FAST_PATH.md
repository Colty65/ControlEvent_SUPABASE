# VNext P1.10 · Generic Table View + Leak Guard + Fast Path

## Motivo
P1.8 resolvía el estado reversible de las tablas de compras, pero no era transversal. En las pruebas del 30/08/2026 una tabla de socios no asistentes repetía exactamente el mismo resultado ante «quita Persona Tita», «ordena por Persona desc» y «filtra por Persona=Tita». Después, una protesta del usuario terminó mostrando una pseudo-llamada interna `default_api.query_ce(...)` en pantalla.

## P1.10
- Se corrige además la petición compuesta **pendientes + socios no asistentes**: el normalizador ya no convierte la segunda llamada de asistencia en otra llamada de ingresos.
- El estado de vista se aplica a **cualquier tabla** producida por `query_ce`, no solo a compras.
- Los nombres de campos se resuelven contra las columnas reales de la tabla; no se crea un catálogo hard-codeado por dominio.
- «quita de la tabla Persona Tita» añade un filtro de exclusión de vista; repetirlo es idempotente.
- «pon/recupera Persona Tita» deshace esa exclusión.
- «filtra por Persona=Tita» sustituye los filtros previos de esa misma columna por el filtro positivo, evitando `eq + neq` incompatibles.
- «ordena por Persona desc/asc» conserva los filtros anteriores y cambia solo el orden de vista.
- `visible_columns` / `hidden_columns` pasan a ser presentación: la fila interna conserva todos sus campos para que ocultar una columna no rompa la respuesta factual.
- «tabla original» restaura filas, orden y columnas de vista sin perder el contrato base (evento, estado, población, asistencia, responsable, etc.).
- El contexto conserva `table_base_args`, filtros, orden, clave de tabla y columnas para reabrir la misma consulta sin una segunda Interaction.
- Una protesta sin nueva orden explícita no dispara herramientas. Además, un guard bloquea textos internos como `call:`, `print(default_api...)` o `query_ce(...)`.

## Fast path
No se añade ninguna llamada IA. Gemini y Supabase siguen arrancando en paralelo; las modificaciones inequívocas de tabla se resuelven localmente sobre el contrato anterior.
