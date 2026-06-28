# ControlEvent v16_prod - OPT3F Resumen hardlock

Base: v16_prod + OPT2J validada + OPT3E rebase seguro.

Alcance cerrado:
- No toca login.
- No toca Entrar / Ver clave.
- No toca /api/state.
- No toca selector de eventos.
- No toca Gráficas ni AVANCE.
- Actúa únicamente sobre Resumen presupuestario > Cálculos por tienda y Ticket.

Cambios:
1. #summaryTiendaTicket pasa a tener un único render controlado para evitar que renderizadores antiguos lo sustituyan.
2. Se bloquean llamadas legacy a renderSummaryList('summaryTiendaTicket', ...).
3. Después de renderBudget se fuerza una sola reconstrucción del bloque con filas propias y detalle disponible.
4. Si una capa antigua vuelve a escribir el bloque, se recupera automáticamente en el siguiente frame.
5. El clic abre detalle incluso si se cuela una fila legacy, reconstruyendo el detalle por la clave visible.
6. Se elimina la reinstalación en cada clic global para reducir carga del PC.

Diagnóstico:
- window.ControlEventOpt3F
