# VNext P1.9 · Continuity Contracts + Grounded Plan B + Fast Path

## Objetivo
Cerrar los fallos observados durante la construcción de P1.8 sin volver al Semantic Core antiguo ni sacrificar el fast path.

## Hereda de P1.8
- Estado reversible de tabla: quitar/poner filas y columnas.
- `tabla original` restaura la vista base.
- `este evento` se resuelve físicamente al evento visible.
- Listas plurales de quienes ya han pagado escapan del foco de una persona anterior.

## P1.9
- Diferencia de forma determinista `ya han pagado` de `NO han pagado`; la negación manda aunque la frase sea corta o continúe el turno anterior.
- Las listas de ingresos pedidas como lista/recitado no se truncan: pantalla y voz conservan todos los nombres.
- Si se piden pendientes + socios no asistentes, ejecuta dos contratos en una sola Interaction.
- `event_attendance(attendance_mode=non_attending_members)` materializa el listado canónico de socios no asistentes.
- Un Plan B que nombre parejas/personas que podrían no ingresar deriva la caída desde las filas reales de ingreso; las donaciones no se restan de la cuota por inferencia.
- Repetir un escenario reutiliza exactamente el delta certificado anterior, incluso si Gemini había propuesto antes un delta equivocado; el contexto guarda el delta que CE realmente ejecutó.
- `plan_detail=true` genera una propuesta de recorte producto a producto sobre compras PENDIENTE, con unidades/importes antes y después y saldo proyectado. No modifica Supabase.
- Conserva el último estado de filtros de compras cuando el usuario dice «partiendo de estos datos».

## Latencia
Se conserva una sola Interaction factual normal, carga Gemini + Supabase en paralelo y cierre local.
