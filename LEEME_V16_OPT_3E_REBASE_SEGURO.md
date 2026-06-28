# ControlEvent v16_prod - OPT3E REBASE SEGURO

Base: v16_prod OPT2J validada.

Motivo:
- Se descartan las pruebas OPT3C/OPT3D sobre entrada/login porque afectaban a la entrada y al selector de eventos.
- No se toca login, doLogin, fetch, /api/state, render global ni presentación inicial.

Incluye:
- Mantiene las optimizaciones de GRAFICAS de OPT2J.
- Añade una optimización segura solo para Resumen presupuestario / Cálculos por tienda y ticket.
- El script solo trabaja cuando hay usuario autenticado, evento seleccionado y el bloque #summaryTiendaTicket existe/está visible.
- Las filas de donaciones/tickets se completan con detalle inmediato sin esperar al refresco tardío.

No toca:
- Login.
- Entrada al sistema.
- Selector principal de eventos.
- Compras.
- Donaciones como módulo.
- Ingresos.
- Documentos.
- Tickets.
- Planificación.
- AVANCE DEL EVENTO.
